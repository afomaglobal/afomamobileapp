import { Country } from 'country-state-city';

import { getStorefrontBaseUrl } from '../../utils/storefrontUrl';
import { getUserShippingSurcharge } from '../api/shippingApi';
import {
  getStoredUserPricingInfo,
  isGeoCoolingDown,
  setStoredUserPricingInfo,
  startGeoCooldown,
} from '../storage/userPricingStorage';
import type { GeoLookupResult, UserPricingInfo } from './types';

const STOREFRONT_GEO_FAST_TIMEOUT_MS = 5000;
const STOREFRONT_GEO_IP_TIMEOUT_MS = 38000;

const COUNTRY_CURRENCY_FALLBACK: Record<string, string> = {
  pakistan: 'PKR',
  nigeria: 'NGN',
  'united states': 'USD',
  'united kingdom': 'GBP',
  canada: 'CAD',
  india: 'INR',
  australia: 'AUD',
};

const currencyJsonInflightByBase = new Map<string, Promise<Record<string, unknown> | null>>();
const surchargeInflightByCountry = new Map<string, Promise<Record<string, number> | null>>();

type StorefrontGeoResponse = {
  ip?: string;
  country?: string;
  country_code?: string;
  currency_code?: string;
  source?: string;
  detected?: boolean;
  error?: string;
};

function normalizeCountryKey(country: string): string {
  return country.trim().toLowerCase();
}

function resolveCurrencyForGeo(country: string, currencyCode?: string): string {
  const normalizedCode = currencyCode?.trim().toUpperCase();
  if (normalizedCode) {
    return normalizedCode;
  }

  return COUNTRY_CURRENCY_FALLBACK[normalizeCountryKey(country)] ?? 'CAD';
}

/** Match web resolveCountryRecord — login country may be a name or ISO code. */
function resolveLoginCountryName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const countries = Country.getAllCountries();
  const lower = trimmed.toLowerCase();

  let match = countries.find((entry) => entry.name.toLowerCase() === lower);
  if (match) {
    return match.name;
  }

  if (trimmed.length === 2) {
    match = countries.find((entry) => entry.isoCode.toLowerCase() === lower);
    if (match) {
      return match.name;
    }
  }

  if (trimmed.length === 3) {
    match = countries.find((entry) => entry.isoCode.toLowerCase() === lower.slice(0, 2));
    if (match) {
      return match.name;
    }
  }

  return trimmed;
}

export function isValidStoredPricingInfo(stored: UserPricingInfo): boolean {
  const country = stored.country?.trim();
  const currency = stored.currency?.trim();
  const rate = Number(stored.currencyRate);

  if (!country || !currency || !Number.isFinite(rate) || rate <= 0) {
    return false;
  }

  if (currency === 'CAD' && normalizeCountryKey(country) !== 'canada') {
    return false;
  }

  return true;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseStorefrontGeoPayload(data: unknown, fallbackIp?: string): GeoLookupResult | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as StorefrontGeoResponse;
  if (record.detected === false) {
    return null;
  }

  const country = record.country?.trim();
  const currencyCode = record.currency_code?.trim();
  if (!country || !currencyCode) {
    return null;
  }

  const ip = (record.ip ?? fallbackIp ?? '').trim();
  if (!ip) {
    return null;
  }

  return {
    ip,
    country,
    currency: currencyCode.toUpperCase(),
  };
}

async function fetchStorefrontGeo(visitorIp?: string): Promise<GeoLookupResult | null> {
  const base = getStorefrontBaseUrl();
  const query = visitorIp ? `?ip=${encodeURIComponent(visitorIp)}` : '';
  const timeoutMs = visitorIp ? STOREFRONT_GEO_IP_TIMEOUT_MS : STOREFRONT_GEO_FAST_TIMEOUT_MS;
  const data = await fetchJsonWithTimeout(`${base}/api/geo${query}`, timeoutMs);
  return parseStorefrontGeoPayload(data, visitorIp);
}

async function fetchCurrencyForCountryCode(alpha2: string): Promise<string | null> {
  const code = alpha2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }

  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?fields=currencies`,
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as Array<{ currencies?: Record<string, unknown> }>;
    const currencies = data[0]?.currencies;
    const currencyCode = currencies ? Object.keys(currencies)[0] : undefined;
    return currencyCode?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

/** Client fallback when storefront geo is unreachable — mirrors server geojs + country-data. */
async function fetchGeojsLookup(visitorIp: string): Promise<GeoLookupResult | null> {
  const data = (await fetchJsonWithTimeout(
    `https://get.geojs.io/v1/ip/country/${encodeURIComponent(visitorIp)}.json`,
    6000,
  )) as { country?: string; ip?: string } | null;

  const alpha2 = data?.country?.trim().toUpperCase();
  if (!alpha2 || !/^[A-Z]{2}$/.test(alpha2)) {
    return null;
  }

  const countries = Country.getAllCountries();
  const record = countries.find((entry) => entry.isoCode.toUpperCase() === alpha2);
  const countryName = record?.name;
  if (!countryName) {
    return null;
  }

  const currency =
    (await fetchCurrencyForCountryCode(alpha2)) ??
    COUNTRY_CURRENCY_FALLBACK[normalizeCountryKey(countryName)] ??
    'CAD';

  return {
    ip: (data?.ip ?? visitorIp).trim(),
    country: countryName,
    currency,
  };
}

export async function getClientIpInBrowser(): Promise<string | null> {
  const services = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://api.ipify.org?format=json',
  ];

  for (const url of services) {
    try {
      const response = await fetch(url);
      const data = (await response.json()) as { ip?: string };
      const ip = data.ip?.trim();
      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        return ip;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/** Match web `fetchGeoInfo` — storefront /api/geo (edge + geojs + ipwhois server-side). */
export async function fetchGeoInfo(): Promise<GeoLookupResult> {
  const edge = await fetchStorefrontGeo();
  if (edge) {
    return edge;
  }

  const visitorIp = await getClientIpInBrowser();
  if (!visitorIp) {
    throw new Error('Could not determine visitor IP for geo pricing.');
  }

  const fromStorefront = await fetchStorefrontGeo(visitorIp);
  if (fromStorefront) {
    return fromStorefront;
  }

  const fromGeojs = await fetchGeojsLookup(visitorIp);
  if (fromGeojs) {
    return fromGeojs;
  }

  throw new Error('Geo lookup failed.');
}

export async function fetchCurrencyRate(base: string, target: string): Promise<number | null> {
  const normalizedBase = (base || 'CAD').toLowerCase();
  const normalizedTarget = (target || '').toLowerCase();
  if (!normalizedTarget) {
    return null;
  }

  let payload: Record<string, unknown> | null;
  if (currencyJsonInflightByBase.has(normalizedBase)) {
    payload = await currencyJsonInflightByBase.get(normalizedBase)!;
  } else {
    const request = (async () => {
      try {
        const response = await fetch(
          `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${normalizedBase}.json`,
        );
        return (await response.json()) as Record<string, unknown>;
      } catch {
        return null;
      } finally {
        currencyJsonInflightByBase.delete(normalizedBase);
      }
    })();
    currencyJsonInflightByBase.set(normalizedBase, request);
    payload = await request;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const rates = payload[normalizedBase] as Record<string, number> | undefined;
  return rates?.[normalizedTarget] ?? null;
}

export async function fetchSurchargeMap(country: string): Promise<Record<string, number> | null> {
  const key = country.trim();
  if (!key) {
    return null;
  }

  if (surchargeInflightByCountry.has(key)) {
    return surchargeInflightByCountry.get(key)!;
  }

  const request = (async () => {
    try {
      const response = await getUserShippingSurcharge(key);
      return (response ?? null) as Record<string, number> | null;
    } catch {
      return null;
    } finally {
      surchargeInflightByCountry.delete(key);
    }
  })();

  surchargeInflightByCountry.set(key, request);
  return request;
}

async function resolveCurrencyForCountry(countryInput: string): Promise<string> {
  const countryName = resolveLoginCountryName(countryInput) ?? countryInput.trim();
  const fallback = COUNTRY_CURRENCY_FALLBACK[normalizeCountryKey(countryName)];
  if (fallback) {
    return fallback;
  }

  const countries = Country.getAllCountries();
  const match = countries.find((entry) => entry.name.toLowerCase() === countryName.toLowerCase());
  if (match) {
    const fromCode = await fetchCurrencyForCountryCode(match.isoCode);
    if (fromCode) {
      return fromCode;
    }
  }

  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=currencies`,
    );
    if (!response.ok) {
      return 'CAD';
    }
    const data = (await response.json()) as Array<{ currencies?: Record<string, unknown> }>;
    const currencies = data[0]?.currencies;
    const code = currencies ? Object.keys(currencies)[0] : undefined;
    return code?.toUpperCase() ?? 'CAD';
  } catch {
    return 'CAD';
  }
}

function hasPricingContextChanged(prev: UserPricingInfo, next: UserPricingInfo): boolean {
  const prevRate = Number(prev.currencyRate ?? 1);
  const nextRate = Number(next.currencyRate ?? 1);

  return (
    String(prev.ip ?? '') !== String(next.ip ?? '') ||
    String(prev.country ?? '') !== String(next.country ?? '') ||
    String(prev.currency ?? '') !== String(next.currency ?? '') ||
    Math.abs(prevRate - nextRate) > 0.0001
  );
}

export function arePricingInfosEqual(prev: UserPricingInfo, next: UserPricingInfo): boolean {
  return !hasPricingContextChanged(prev, next);
}

export async function updateGuestPricingFromGeo(
  geoData: GeoLookupResult,
): Promise<{ userInfo: UserPricingInfo; changed: boolean }> {
  const prev = await getStoredUserPricingInfo();
  const displayCurrency = resolveCurrencyForGeo(geoData.country, geoData.currency);
  const rate = await fetchCurrencyRate('CAD', displayCurrency);

  const userInfo: UserPricingInfo = {
    ip: geoData.ip,
    country: geoData.country,
    currency: rate ? displayCurrency : 'CAD',
    currencyRate: rate ?? 1,
    surCharge: (await fetchSurchargeMap(geoData.country)) ?? undefined,
  };

  const changed = hasPricingContextChanged(prev, userInfo);
  await setStoredUserPricingInfo(userInfo);
  return { userInfo, changed };
}

export async function updateLoginPricingFromCountry(
  loginCountry: string,
  currentIp?: string | null,
): Promise<{ userInfo: UserPricingInfo; changed: boolean }> {
  const prev = await getStoredUserPricingInfo();
  const countryName = resolveLoginCountryName(loginCountry) ?? loginCountry.trim();
  const currency = await resolveCurrencyForCountry(countryName);
  const currencyRate = (await fetchCurrencyRate('CAD', currency)) ?? 1;

  const userInfo: UserPricingInfo = {
    ip: currentIp ?? prev.ip,
    country: countryName,
    currency,
    currencyRate,
    surCharge: (await fetchSurchargeMap(countryName)) ?? undefined,
  };

  const changed = hasPricingContextChanged(prev, userInfo);
  await setStoredUserPricingInfo(userInfo);
  return { userInfo, changed };
}

export async function refreshGuestGeoPricing(): Promise<{ userInfo: UserPricingInfo; changed: boolean }> {
  const stored = await getStoredUserPricingInfo();

  if (await isGeoCoolingDown()) {
    if (isValidStoredPricingInfo(stored)) {
      return { userInfo: stored, changed: false };
    }

    return {
      userInfo: {
        currency: 'CAD',
        currencyRate: 1,
      },
      changed: !isValidStoredPricingInfo(stored),
    };
  }

  let geo: GeoLookupResult;
  try {
    geo = await fetchGeoInfo();
  } catch {
    await startGeoCooldown();

    if (isValidStoredPricingInfo(stored)) {
      return { userInfo: stored, changed: false };
    }

    return {
      userInfo: {
        currency: 'CAD',
        currencyRate: 1,
      },
      changed: !isValidStoredPricingInfo(stored),
    };
  }

  const currency = resolveCurrencyForGeo(geo.country, geo.currency);
  const storedCurrency = stored.currency?.trim().toUpperCase();
  const geoMatchesStored =
    stored.ip === geo.ip &&
    stored.country === geo.country &&
    storedCurrency === currency &&
    isValidStoredPricingInfo(stored);

  if (geoMatchesStored) {
    return { userInfo: stored, changed: false };
  }

  return updateGuestPricingFromGeo({ ...geo, currency });
}

export function resolveLoginCountry(profile: {
  country?: string;
  countryName?: string;
  Country?: string;
}): string | undefined {
  return profile.country?.trim() || profile.countryName?.trim() || profile.Country?.trim() || undefined;
}

export interface PricingBootstrapResult {
  userInfo: UserPricingInfo;
  changed: boolean;
  usedStoredSnapshot: boolean;
}

export async function bootstrapPricingContext(options: {
  isAuthenticated: boolean;
  loginCountry?: string;
}): Promise<PricingBootstrapResult> {
  if (options.isAuthenticated && options.loginCountry) {
    let currentIp: string | undefined;
    try {
      currentIp = (await fetchGeoInfo()).ip;
    } catch {
      const stored = await getStoredUserPricingInfo();
      currentIp = stored.ip;
    }

    const { userInfo, changed } = await updateLoginPricingFromCountry(
      options.loginCountry,
      currentIp,
    );
    return { userInfo, changed, usedStoredSnapshot: false };
  }

  const hadStoredSnapshot = isValidStoredPricingInfo(await getStoredUserPricingInfo());
  const { userInfo, changed } = await refreshGuestGeoPricing();
  return { userInfo, changed, usedStoredSnapshot: hadStoredSnapshot && !changed };
}