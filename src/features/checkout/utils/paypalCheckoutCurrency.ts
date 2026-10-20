import { fetchCurrencyRate } from '../../../services/pricing/geoPricingService';
import type { UserPricingInfo } from '../../../services/pricing/types';

const PAYPAL_USD_COUNTRIES = ['Pakistan', 'Nigeria'];

export function resolvePayPalCheckoutCurrency(
  userInfo: UserPricingInfo,
  shippingCountry?: string,
): string {
  const country = (shippingCountry || userInfo.country || '').trim();

  if (
    PAYPAL_USD_COUNTRIES.some(
      (blockedCountry) => blockedCountry.toLowerCase() === country.toLowerCase(),
    )
  ) {
    return 'USD';
  }

  return userInfo.currency ?? 'CAD';
}

/**
 * PayPal createorder expects `subTotal` / shipping in CAD and multiplies by
 * `conversionRate` to get the charge amount in `currency` (web checkout.jsx).
 * When checkout currency differs from display (e.g. NGN display → USD PayPal),
 * use CAD→PayPal rate — not the shopper's CAD→NGN display rate.
 */
export async function resolvePayPalConversionRate(
  userInfo: UserPricingInfo,
  paypalCurrency: string,
): Promise<number> {
  const displayCurrency = (userInfo.currency ?? 'CAD').toUpperCase();
  const targetCurrency = (paypalCurrency || 'CAD').toUpperCase();

  if (targetCurrency === displayCurrency) {
    return userInfo.currencyRate ?? 1;
  }

  const cadToPayPal = await fetchCurrencyRate('CAD', targetCurrency);
  if (cadToPayPal != null && cadToPayPal > 0) {
    return cadToPayPal;
  }

  if (targetCurrency === 'USD' && displayCurrency === 'CAD') {
    return userInfo.currencyRate ?? 1;
  }

  return userInfo.currencyRate ?? 1;
}
