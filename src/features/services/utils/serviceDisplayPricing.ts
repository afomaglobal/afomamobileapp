import type { Product } from '../../../services/types/product';
import type { UserPricingInfo } from '../../../services/pricing/types';

export function formatServiceAmount(price: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

export function getServiceDisplayPricing(service: Product | null | undefined, userInfo?: UserPricingInfo) {
  const currencyLabel = (userInfo?.currency || 'CAD').toUpperCase();
  const conversionRate = userInfo?.currencyRate ?? 1;
  const priceType = service?.serviceDetails?.priceType || 'fixed';
  const cadBase = parseFloat(String(service?.finalPrice ?? service?.price ?? 0)) || 0;
  const displayPrice = cadBase * conversionRate;
  const pricePrefix = priceType === 'from' ? 'From ' : '';

  return {
    currencyLabel,
    conversionRate,
    displayPrice,
    pricePrefix,
    priceType,
  };
}

export function formatServicePriceLabel(
  currencyLabel: string,
  amount: number,
  options: { prefix?: string } = {},
): string {
  return `${options.prefix ?? ''}${currencyLabel} ${formatServiceAmount(amount)}`;
}
