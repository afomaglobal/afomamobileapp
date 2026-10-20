import type { CartLineItem, CartMap } from '../../../services/types/cart';
import type { Product } from '../../../services/types/product';
import type { ServiceBookingDetails, ServiceSlotSelectionHold } from '../types/service';
import { isServiceProduct } from './isServiceProduct';

export function serviceCartLineId(bookingRef: string): string {
  return `svc:${bookingRef}`;
}

export function isServiceAppointmentLine(line: CartLineItem | null | undefined): boolean {
  if (!line) {
    return false;
  }
  if (line.productData?.productType !== 'Service') {
    return false;
  }
  return Boolean(line.bookingDetails?.startsAt || line.bookingDetails?.bookingRef);
}

export function appointmentSlotKeyFromParts(parts: {
  productId?: string;
  staffId?: string | null;
  startsAt?: string;
}): string | null {
  const { productId, staffId, startsAt } = parts;
  if (!productId || !startsAt) {
    return null;
  }
  const staff = staffId ? String(staffId) : '';
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  return `${String(productId)}|${staff}|${start.toISOString()}`;
}

export function appointmentSlotKeyFromHold(
  hold: ServiceSlotSelectionHold,
  service: Product,
): string | null {
  return appointmentSlotKeyFromParts({
    productId: service._id,
    staffId: hold.staffId,
    startsAt: hold.startsAt,
  });
}

export function appointmentSlotKeyFromLine(line: CartLineItem): string | null {
  const bd = line.bookingDetails;
  return appointmentSlotKeyFromParts({
    productId: line.productData?._id,
    staffId: bd?.staffId,
    startsAt: bd?.startsAt,
  });
}

export function resolveServiceCartLineId(hold: ServiceSlotSelectionHold, service: Product): string | null {
  if (hold.bookingRef) {
    return serviceCartLineId(hold.bookingRef);
  }
  const slotKey = appointmentSlotKeyFromHold(hold, service);
  if (!slotKey) {
    return null;
  }
  return `svc:sel:${slotKey.replace(/\|/g, '--')}`;
}

export function findActiveDuplicateAppointmentInCart(
  cart: CartMap,
  slotKey: string | null,
  excludeLineId?: string,
): { lineId: string; line: CartLineItem } | null {
  if (!slotKey) {
    return null;
  }
  for (const [lineId, line] of Object.entries(cart)) {
    if (excludeLineId && lineId === excludeLineId) {
      continue;
    }
    if (!isServiceAppointmentLine(line)) {
      continue;
    }
    if (appointmentSlotKeyFromLine(line) === slotKey) {
      return { lineId, line };
    }
  }
  return null;
}

export function buildServiceCartLineFromHold(
  hold: ServiceSlotSelectionHold,
  service: Product,
): CartLineItem {
  const basePrice =
    parseFloat(String(hold.priceSnapshot?.baseAmount ?? service.finalPrice ?? service.price ?? 0)) || 0;
  const addOnTotal = parseFloat(String(hold.priceSnapshot?.addOnsAmount ?? 0)) || 0;
  const unitPrice =
    parseFloat(String(hold.priceSnapshot?.amount)) ||
    basePrice + addOnTotal ||
    parseFloat(String(service.finalPrice ?? service.price ?? 0)) ||
    0;

  const bookingDetails: ServiceBookingDetails = {
    ...(hold.bookingRef ? { bookingRef: hold.bookingRef } : {}),
    ...(hold.holdExpiresAt ? { holdExpiresAt: hold.holdExpiresAt } : {}),
    startsAt: hold.startsAt,
    endsAt: hold.endsAt,
    timezone: hold.display?.timezone,
    displayDate: hold.display?.date,
    displayTime: hold.display?.time,
    staffId: hold.staffId ?? null,
    staffName: hold.display?.staffName ?? null,
    serviceFulfillment: hold.serviceFulfillment ?? null,
    addOns: hold.selectedAddOns ?? [],
    baseServiceAmount: basePrice,
    addOnsAmount: addOnTotal,
  };

  return {
    orderQuantiy: 1,
    totalAmount: unitPrice,
    basePrice: unitPrice,
    productData: service,
    shippingRate: 0,
    shippingService: { carrier_name: 'Service Appointment' },
    bookingDetails,
  };
}

export function cartIsServiceAppointmentsOnly(cart: CartMap): boolean {
  const lines = Object.values(cart);
  if (!lines.length) {
    return false;
  }
  return lines.every((line) => isServiceAppointmentLine(line) || isServiceProduct(line.productData));
}

export function cartHasServiceAppointmentLines(cart: CartMap): boolean {
  return Object.values(cart).some((line) => isServiceAppointmentLine(line));
}

export function formatServiceAppointmentSummary(line: CartLineItem): string | undefined {
  const bd = line.bookingDetails;
  if (!bd?.startsAt && !bd?.displayDate) {
    return undefined;
  }
  const parts: string[] = [];
  if (bd.displayDate && bd.displayTime) {
    parts.push(`${bd.displayDate} · ${bd.displayTime}`);
  } else if (bd.startsAt) {
    parts.push(new Date(bd.startsAt).toLocaleString());
  }
  if (bd.staffName) {
    parts.push(bd.staffName);
  }
  if (bd.serviceFulfillment === 'mobile') {
    parts.push('Home service');
  } else if (bd.serviceFulfillment === 'at_salon') {
    parts.push('Shop');
  }
  return parts.length ? parts.join(' · ') : undefined;
}
