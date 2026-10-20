import { getCartByUserId } from '../../../services/api/cartApi';
import { loadGuestCart } from '../../../services/storage/cartStorage';
import type { CartMap } from '../../../services/types/cart';
import { normalizeCartMap } from './cartUtils';
import { hasLocalCartEdits, readCartMemoryMap } from './cartMemoryCache';

/** Prefer in-memory cart so add-to-cart never merges against stale server data after a local remove. */
export async function resolveCartForAdd(userId?: string): Promise<CartMap> {
  const memoryCart = readCartMemoryMap(userId);
  if (memoryCart != null || hasLocalCartEdits()) {
    return normalizeCartMap(memoryCart ?? {});
  }

  if (userId) {
    const response = await getCartByUserId(userId);
    const memoryAfterFetch = readCartMemoryMap(userId);
    if (memoryAfterFetch != null || hasLocalCartEdits()) {
      return normalizeCartMap(memoryAfterFetch ?? {});
    }
    return normalizeCartMap(response.cart);
  }

  const guestCart = await loadGuestCart();
  const memoryAfterFetch = readCartMemoryMap(userId);
  if (memoryAfterFetch != null || hasLocalCartEdits()) {
    return normalizeCartMap(memoryAfterFetch ?? {});
  }

  return normalizeCartMap(guestCart);
}
