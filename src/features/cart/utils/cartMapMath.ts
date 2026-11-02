import type { CartMap } from '../../../services/types/cart';

/** Pure cart-map helpers (no RN/API imports) — safe for node unit tests. */

export function normalizeCartMap(cart: CartMap | null | undefined): CartMap {
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
    return {};
  }
  return cart;
}

export function calculateSubTotal(cart: CartMap): number {
  return Object.values(normalizeCartMap(cart)).reduce((sum, line) => sum + (line.totalAmount ?? 0), 0);
}

export function getCartItemCount(cart: CartMap): number {
  return Object.values(normalizeCartMap(cart)).reduce((sum, line) => sum + (line.orderQuantiy ?? 0), 0);
}
