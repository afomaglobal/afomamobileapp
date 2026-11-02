import type { SellerProfile } from '../types/sellerProfile';

export const SELLER_MARKETPLACE_ACTIVATION_NG_ONLY_CODE = 'SELLER_MARKETPLACE_ACTIVATION_NG_ONLY';

export const SELLER_MARKETPLACE_GEO_BLOCKED_MESSAGE =
  'Only Nigeria-based sellers can open a shop, create new listings, or activate products during our Nigeria launch. You can still sign in and manage your account.';

function normalizeCountryCode(value?: string | null): string {
  return (value ?? '').trim().toUpperCase();
}

function normalizeCountryName(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object' && value !== null && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name.trim() : '';
  }
  return String(value).trim();
}

/** Matches backend `isNigeriaSellerRecord`. */
export function isNigeriaSellerRecord(seller?: Pick<SellerProfile, 'country' | 'countryCode'> | null): boolean {
  if (!seller) {
    return false;
  }
  if (normalizeCountryCode(seller.countryCode) === 'NG') {
    return true;
  }
  return normalizeCountryName(seller.country).toLowerCase() === 'nigeria';
}

export function canSellerActivateMarketplace(
  seller?: Pick<SellerProfile, 'country' | 'countryCode'> | null,
): boolean {
  return isNigeriaSellerRecord(seller);
}
