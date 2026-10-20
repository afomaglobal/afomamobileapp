import { getCartByUserId } from '../../../services/api/cartApi';
import { loadGuestCart, saveGuestCart } from '../../../services/storage/cartStorage';
import type { UserPricingInfo } from '../../../services/pricing/types';
import type { CartMap } from '../../../services/types/cart';
import type { Product } from '../../../services/types/product';
import type { ServiceSlotSelectionHold } from '../../services/types/service';
import {
  appointmentSlotKeyFromHold,
  buildServiceCartLineFromHold,
  findActiveDuplicateAppointmentInCart,
  isServiceAppointmentLine,
  resolveServiceCartLineId,
} from '../../services/utils/serviceCartLine';
import { calculateSurcharge } from '../../../services/pricing/pricingUtils';
import { notifyCartChanged } from './cartRefresh';
import { invalidateCartShipping } from './applyShippingToCart';
import { persistCart, normalizeCartMap } from './cartUtils';
import { getCartMemoryCache, setCartMemoryCache } from './cartMemoryCache';

const ZERO_SHIPPING_RATES = {
  totalShippingRate: 0,
  fetchedShippingRate: 0,
} as const;

export class ServiceCartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceCartValidationError';
  }
}

export async function addServiceAppointmentToCart(
  userId: string | undefined,
  hold: ServiceSlotSelectionHold,
  service: Product,
  userInfo: UserPricingInfo,
): Promise<{ lineId: string }> {
  if (!hold?.startsAt || !service?._id) {
    throw new ServiceCartValidationError('Select a time slot to continue.');
  }

  const lineId = resolveServiceCartLineId(hold, service);
  if (!lineId) {
    throw new ServiceCartValidationError('Unable to add this appointment.');
  }

  const slotKey = appointmentSlotKeyFromHold(hold, service);

  let currentCart: CartMap = {};
  const cached = getCartMemoryCache(userId);
  if (cached) {
    currentCart = normalizeCartMap(cached.cart);
  } else if (userId) {
    const existingCartResponse = await getCartByUserId(userId);
    currentCart = existingCartResponse.cart ?? {};
  } else {
    currentCart = await loadGuestCart();
  }

  const duplicate = findActiveDuplicateAppointmentInCart(currentCart, slotKey);
  if (duplicate) {
    throw new ServiceCartValidationError(
      'This appointment is already in your cart for the same team member and time.',
    );
  }

  const surcharged = calculateSurcharge([service], userInfo);
  const pricedProduct = surcharged[0] ?? service;

  const nextCart: CartMap = { ...currentCart };

  if (slotKey) {
    for (const [existingId, existingLine] of Object.entries(nextCart)) {
      if (existingId === lineId || !isServiceAppointmentLine(existingLine)) {
        continue;
      }
      if (appointmentSlotKeyFromHold(
        {
          startsAt: existingLine.bookingDetails?.startsAt ?? '',
          staffId: existingLine.bookingDetails?.staffId,
        },
        existingLine.productData ?? service,
      ) !== slotKey) {
        continue;
      }
      delete nextCart[existingId];
    }
  }

  const line = buildServiceCartLineFromHold(hold, pricedProduct);
  line.productData = pricedProduct;
  line.basePrice = line.totalAmount ?? line.basePrice;
  nextCart[lineId] = line;

  const cartWithInvalidatedShipping = invalidateCartShipping(nextCart);

  setCartMemoryCache(userId, {
    cart: cartWithInvalidatedShipping,
    ...ZERO_SHIPPING_RATES,
  });
  notifyCartChanged();

  if (userId) {
    await persistCart(userId, cartWithInvalidatedShipping, ZERO_SHIPPING_RATES);
  } else {
    await saveGuestCart(cartWithInvalidatedShipping);
  }

  return { lineId };
}
