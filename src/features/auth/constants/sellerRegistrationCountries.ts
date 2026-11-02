import type { SelectOption } from '../../../utils/regionOptions';

/** Nigeria launch — restore full country list when expanding seller regions. */
export const SELLER_REGISTRATION_COUNTRY_OPTIONS: SelectOption[] = [
  { label: 'Nigeria', value: 'Nigeria' },
];

export const SELLER_REGISTRATION_COUNTRY_CODE = 'NG';

export const SELLER_GEO_LAUNCH_LOGIN_MESSAGE =
  'AFOMA is currently onboarding sellers in Nigeria only. Your seller account is temporarily unavailable while we expand to more countries. If you have questions, contact contact@afoma.io.';

export const SELLER_REGISTRATION_COUNTRY_REJECT_MESSAGE =
  'Seller registration is currently limited to Nigeria. Please select Nigeria as your business country.';

export function isSellerRegistrationCountryAllowed(country: string, countryCode?: string): boolean {
  const code = (countryCode || '').trim().toUpperCase();
  if (code === SELLER_REGISTRATION_COUNTRY_CODE) {
    return true;
  }
  return country.trim().toLowerCase() === 'nigeria';
}
