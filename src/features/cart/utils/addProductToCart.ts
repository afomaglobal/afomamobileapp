import type { UserPricingInfo } from '../../../services/pricing/types';
import type { CartMap } from '../../../services/types/cart';
import type { Product } from '../../../services/types/product';
import type { VariationAttributeSelection } from '../../products/utils/productVariations';
import {
  AddToCartValidationError,
  mergeProductIntoCart,
  type PreparedCartLine,
} from './cartLineMerge';
import { notifyCartChanged } from './cartRefresh';
import { invalidateCartShipping } from './applyShippingToCart';
import { normalizeCartMap, writeCartToStorage } from './cartUtils';
import { clearCachedShippingRates } from '../../checkout/utils/shippingRatesCache';
import { bumpLocalCartRevision, setCartMemoryCache } from './cartMemoryCache';
import { resolveCartForAdd } from './resolveCartForAdd';

const ZERO_SHIPPING_RATES = {
  totalShippingRate: 0,
  fetchedShippingRate: 0,
} as const;

export { AddToCartValidationError } from './cartLineMerge';
export type { PreparedCartLine } from './cartLineMerge';

export interface AddToCartOptions {
  quantity?: number;
  cartKey?: string;
  selectedVariations?: VariationAttributeSelection[];
  maxQuantity?: number | string;
  mergeMode?: 'increment' | 'set';
}

export async function addProductToCart(
  userId: string | undefined,
  product: Product,
  userInfo: UserPricingInfo,
  options: AddToCartOptions = {},
): Promise<PreparedCartLine> {
  const currentCart = await resolveCartForAdd(userId);

  const { cart: mergedCart, prepared } = mergeProductIntoCart(currentCart, {
    product,
    userInfo,
    quantity: options.quantity ?? 1,
    cartKey: options.cartKey,
    selectedVariations: options.selectedVariations ?? [],
    maxQuantity: options.maxQuantity,
    mergeMode: options.mergeMode ?? 'set',
  });

  const nextCart = invalidateCartShipping(mergedCart);

  if (prepared.totalQuantity <= 0) {
    throw new AddToCartValidationError('Unable to add this item to your cart.');
  }

  setCartMemoryCache(userId, {
    cart: nextCart,
    ...ZERO_SHIPPING_RATES,
  });
  bumpLocalCartRevision();
  clearCachedShippingRates();
  notifyCartChanged();

  await writeCartToStorage(userId, nextCart, ZERO_SHIPPING_RATES);

  return prepared;
}
