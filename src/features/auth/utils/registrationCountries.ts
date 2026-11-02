import { useMemo } from 'react';

import { getCountrySelectOptions, type SelectOption } from '../../../utils/regionOptions';
import { BLOCKED_REGISTRATION_COUNTRIES } from '../constants/registrationOptions';
import { SELLER_REGISTRATION_COUNTRY_OPTIONS } from '../constants/sellerRegistrationCountries';

const blockedCountrySet = new Set(
  BLOCKED_REGISTRATION_COUNTRIES.map((country) => country.toLowerCase()),
);

/** Buyer registration — full list minus sanctions blocklist. */
export function getBuyerRegistrationCountryOptions(): SelectOption[] {
  // --- Nigeria launch: seller-only restriction; buyer list unchanged ---
  // return getCountrySelectOptions().filter(
  //   (option) => !blockedCountrySet.has(option.value.toLowerCase()),
  // );
  return getCountrySelectOptions().filter(
    (option) => !blockedCountrySet.has(option.value.toLowerCase()),
  );
}

/** Seller self-service registration — Nigeria only for launch. */
export function getSellerRegistrationCountryOptions(): SelectOption[] {
  return SELLER_REGISTRATION_COUNTRY_OPTIONS;
}

/** @deprecated Use getBuyerRegistrationCountryOptions or getSellerRegistrationCountryOptions */
export function getRegistrationCountryOptions(): SelectOption[] {
  return getBuyerRegistrationCountryOptions();
}

export function useBuyerRegistrationCountryOptions(): SelectOption[] {
  return useMemo(() => getBuyerRegistrationCountryOptions(), []);
}

export function useSellerRegistrationCountryOptions(): SelectOption[] {
  return useMemo(() => getSellerRegistrationCountryOptions(), []);
}

export function useRegistrationCountryOptions(): SelectOption[] {
  return useBuyerRegistrationCountryOptions();
}
