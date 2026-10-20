import type { CartMap } from '../../../services/types/cart';
import type { ServiceDetails } from '../types/service';
import { isServiceAppointmentLine } from './serviceCartLine';

export function serviceDetailsAcceptOnlinePayment(details?: ServiceDetails | null): boolean {
  if (!details || typeof details !== 'object') {
    return false;
  }
  if (details.acceptOnlinePayment != null) {
    return Boolean(details.acceptOnlinePayment);
  }
  return true;
}

export function cartIsServiceOnly(cart: CartMap): boolean {
  const items = Object.values(cart);
  if (!items.length) {
    return false;
  }
  return items.every(
    (item) =>
      item?.productData?.productType === 'Service' ||
      Boolean(item?.bookingDetails?.startsAt || item?.bookingDetails?.bookingRef),
  );
}

export function cartAllowsPayAtVenue(cart: CartMap): boolean {
  const items = Object.values(cart);
  if (!items.length) {
    return false;
  }
  if (
    !items.every(
      (item) => item?.productData?.productType === 'Service' || item?.bookingDetails?.bookingRef,
    )
  ) {
    return false;
  }
  if (
    !items.every(
      (item) => item?.bookingDetails?.startsAt || item?.bookingDetails?.bookingRef,
    )
  ) {
    return false;
  }
  const sellerIds = new Set(
    items
      .map((item) => item?.productData?.seller?._id && String(item.productData.seller._id))
      .filter(Boolean),
  );
  if (sellerIds.size !== 1) {
    return false;
  }
  return true;
}

export function cartAllowsServiceOnlinePayment(cart: CartMap): boolean {
  const items = Object.values(cart);
  if (!items.length) {
    return true;
  }
  for (const item of items) {
    const isService =
      item?.productData?.productType === 'Service' ||
      Boolean(item?.bookingDetails?.startsAt || item?.bookingDetails?.bookingRef);
    if (
      isService &&
      !serviceDetailsAcceptOnlinePayment(item?.productData?.serviceDetails as ServiceDetails | undefined)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Mixed or product-only carts: standard online checkout (PayPal, card, etc.).
 * Service-only carts: online methods only when service settings allow; otherwise pay-at-appointment only.
 * Mirrors web checkout.jsx `showOnlinePaymentMethods`.
 */
export function cartShouldShowOnlinePaymentMethods(cart: CartMap): boolean {
  if (!cartIsServiceOnly(cart)) {
    return true;
  }

  const payAtVenueEligible = cartAllowsPayAtVenue(cart);
  const serviceOnlineAllowed = cartAllowsServiceOnlinePayment(cart);
  return !payAtVenueEligible || serviceOnlineAllowed;
}

export function cartLineIsServiceOrderLine(line: CartMap[string]): boolean {
  if (!line) {
    return false;
  }
  if (line.productData?.productType === 'Service') {
    return true;
  }
  return isServiceAppointmentLine(line);
}
