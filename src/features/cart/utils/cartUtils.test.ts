import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateSubTotal, getCartItemCount, normalizeCartMap } from './cartMapMath';
import type { CartMap } from '../../../services/types/cart';

describe('cartUtils', () => {
  it('normalizeCartMap returns empty object for invalid input', () => {
    assert.deepEqual(normalizeCartMap(null), {});
    assert.deepEqual(normalizeCartMap(undefined), {});
    assert.deepEqual(normalizeCartMap([] as unknown as CartMap), {});
  });

  it('calculateSubTotal sums line totalAmount', () => {
    const cart: CartMap = {
      a: { totalAmount: 10.5, orderQuantiy: 1 } as CartMap[string],
      b: { totalAmount: 4.5, orderQuantiy: 2 } as CartMap[string],
    };
    assert.equal(calculateSubTotal(cart), 15);
  });

  it('getCartItemCount sums orderQuantiy', () => {
    const cart: CartMap = {
      a: { totalAmount: 1, orderQuantiy: 2 } as CartMap[string],
      b: { totalAmount: 1, orderQuantiy: 3 } as CartMap[string],
    };
    assert.equal(getCartItemCount(cart), 5);
  });
});
