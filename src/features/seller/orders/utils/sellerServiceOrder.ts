import type { CartLineItem } from '../../../../services/types/cart';
import type { SellerOrderDetail, SellerOrderSummary } from '../types/sellerOrder';
import { getSellerOrderLineItems } from './sellerOrderMappers';

const SERVICE_ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed'],
};

function cartLineIsServiceOrderLine(line: CartLineItem): boolean {
  const product = line.productData;
  if (!product) {
    return Boolean(line.bookingDetails?.bookingRef);
  }
  if (product.productType === 'Service') {
    return true;
  }
  const details = product.serviceDetails;
  if (details && typeof details === 'object') {
    if (details.durationMinutes != null || details.priceType) {
      return true;
    }
  }
  return Boolean(line.bookingDetails?.bookingRef);
}

export function isSellerServiceOrder(order?: SellerOrderSummary | SellerOrderDetail | null): boolean {
  const lines = order ? getSellerOrderLineItems(order) : [];
  if (!lines.length) {
    return false;
  }
  return lines.every(cartLineIsServiceOrderLine);
}

export function getAllowedSellerServiceOrderTransitions(fromStatus?: string): string[] {
  const from = fromStatus?.trim();
  if (!from) {
    return [];
  }
  return SERVICE_ORDER_STATUS_TRANSITIONS[from] ?? [];
}

export function buildSellerServiceOrderStatusOptions(currentStatus?: string): Array<{
  label: string;
  value: string;
}> {
  const current = currentStatus?.trim() || 'Pending';
  const allowed = getAllowedSellerServiceOrderTransitions(current);
  const options: Array<{ label: string; value: string }> = [
    { label: `${current} (current)`, value: current },
  ];

  for (const next of allowed) {
    options.push({ label: next, value: next });
  }

  return options;
}

export function canUpdateSellerServiceOrderStatus(currentStatus?: string): boolean {
  return getAllowedSellerServiceOrderTransitions(currentStatus).length > 0;
}

export function isDestructiveSellerServiceOrderStatus(value: string): boolean {
  return value === 'Cancelled';
}
