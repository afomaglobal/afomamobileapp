import type { CartMap } from '../../../services/types/cart';

export interface CartMemorySnapshot {
  userKey: string;
  cart: CartMap;
  totalShippingRate: number;
  fetchedShippingRate: number;
}

let cartMemoryCache: CartMemorySnapshot | null = null;
let localCartRevision = 0;

function cartUserKey(userId?: string): string {
  return userId ?? 'guest';
}

export function getLocalCartRevision(): number {
  return localCartRevision;
}

export function hasLocalCartEdits(): boolean {
  return localCartRevision > 0;
}

export function bumpLocalCartRevision(): number {
  localCartRevision += 1;
  return localCartRevision;
}

export function getCartMemoryCache(userId?: string): CartMemorySnapshot | null {
  if (!cartMemoryCache) {
    return null;
  }

  return cartMemoryCache.userKey === cartUserKey(userId) ? cartMemoryCache : null;
}

export function readCartMemoryMap(userId?: string): CartMap | null {
  const cached = getCartMemoryCache(userId);
  if (!cached) {
    return null;
  }

  if (!cached.cart || typeof cached.cart !== 'object' || Array.isArray(cached.cart)) {
    return {};
  }

  return cached.cart;
}

export function setCartMemoryCache(
  userId: string | undefined,
  snapshot: Pick<CartMemorySnapshot, 'cart' | 'totalShippingRate' | 'fetchedShippingRate'>,
): void {
  cartMemoryCache = {
    userKey: cartUserKey(userId),
    cart:
      snapshot.cart && typeof snapshot.cart === 'object' && !Array.isArray(snapshot.cart)
        ? snapshot.cart
        : {},
    totalShippingRate: snapshot.totalShippingRate ?? 0,
    fetchedShippingRate: snapshot.fetchedShippingRate ?? 0,
  };
}

export function clearCartMemoryCache(): void {
  cartMemoryCache = null;
  localCartRevision = 0;
}
