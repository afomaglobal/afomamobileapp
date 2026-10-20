import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getErrorMessage } from '../../../services/api/errors';
import type { UserPricingInfo } from '../../../services/pricing/types';
import { loadGuestCart, saveGuestCart } from '../../../services/storage/cartStorage';
import type { CartMap } from '../../../services/types/cart';
import type { VariationAttributeSelection } from '../../products/utils/productVariations';
import {
  calculateSubTotal,
  getCartEntries,
  loadUserCart,
  normalizeCartMap,
  persistCart,
  removeCartLine,
  writeCartToStorage,
  replaceCartLineVariations,
  updateCartLineQuantity,
} from '../utils/cartUtils';
import { syncCartLinePrices } from '../utils/cartPricing';
import { getCartShippingTotal, invalidateCartShipping } from '../utils/applyShippingToCart';
import { computePersistedShippingTotals, normalizeStoredShippingRates } from '../utils/resolveCartShipping';
import {
  bumpLocalCartRevision,
  getCartMemoryCache,
  hasLocalCartEdits,
  readCartMemoryMap,
  setCartMemoryCache,
} from '../utils/cartMemoryCache';
import { notifyCartChanged, subscribeCartRefresh } from '../utils/cartRefresh';
import {
  addServiceAppointmentToCart as persistServiceAppointment,
  ServiceCartValidationError,
} from '../utils/addServiceAppointmentToCart';
import { releaseServiceBookingHold } from '../../services/api/serviceBookingApi';
import { clearCachedShippingRates } from '../../checkout/utils/shippingRatesCache';
import type { Product } from '../../../services/types/product';
import type { ServiceSlotSelectionHold } from '../../services/types/service';

type CartShippingRates = {
  totalShippingRate: number;
  fetchedShippingRate: number;
};

const ZERO_SHIPPING_RATES: CartShippingRates = {
  totalShippingRate: 0,
  fetchedShippingRate: 0,
};

export function useCartState(userId?: string, userInfo?: UserPricingInfo, accessToken?: string) {
  const initialCache = getCartMemoryCache(userId);
  const initialCart = normalizeCartMap(initialCache?.cart);
  const [cart, setCart] = useState<CartMap>(initialCart);
  const [totalShippingRate, setTotalShippingRate] = useState(initialCache?.totalShippingRate ?? 0);
  const [fetchedShippingRate, setFetchedShippingRate] = useState(initialCache?.fetchedShippingRate ?? 0);
  const [isRefreshing, setIsRefreshing] = useState(
    !initialCache || Object.keys(initialCart).length === 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const cartMutationRef = useRef(0);
  const latestCartRef = useRef<CartMap>(initialCart);

  useEffect(() => {
    latestCartRef.current = cart;
  }, [cart]);

  const bumpCartMutation = useCallback(() => {
    cartMutationRef.current += 1;
    bumpLocalCartRevision();
  }, []);

  const getLatestCart = useCallback(() => latestCartRef.current, []);

  const getCartLineKeys = useCallback(
    () =>
      Object.keys(latestCartRef.current)
        .sort()
        .join('|'),
    [],
  );

  const persistLatestCart = useCallback(async (): Promise<boolean> => {
    const snapshot = latestCartRef.current;

    try {
      if (userId) {
        if (!accessToken?.trim()) {
          return false;
        }
        await persistCart(userId, snapshot, ZERO_SHIPPING_RATES);
      } else {
        await saveGuestCart(snapshot);
      }
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save cart'));
      return false;
    }
  }, [accessToken, userId]);

  const loadCart = useCallback(async () => {
    const mutationAtStart = cartMutationRef.current;
    const cachedSnapshot = getCartMemoryCache(userId);

    if (hasLocalCartEdits() || (cachedSnapshot && cartMutationRef.current > 0)) {
      if (mutationAtStart === cartMutationRef.current) {
        const cachedCart = normalizeCartMap(
          readCartMemoryMap(userId) ?? cachedSnapshot?.cart ?? {},
        );
        setCart(cachedCart);
        setTotalShippingRate(cachedSnapshot?.totalShippingRate ?? 0);
        setFetchedShippingRate(cachedSnapshot?.fetchedShippingRate ?? 0);
        setCartMemoryCache(userId, {
          cart: cachedCart,
          totalShippingRate: cachedSnapshot?.totalShippingRate ?? 0,
          fetchedShippingRate: cachedSnapshot?.fetchedShippingRate ?? 0,
        });
      }
      setIsRefreshing(false);
      return;
    }
    const applyLoadedCart = (nextCart: CartMap, shipping: CartShippingRates) => {
      if (mutationAtStart !== cartMutationRef.current) {
        return false;
      }

      setCart(nextCart);
      setTotalShippingRate(shipping.totalShippingRate);
      setFetchedShippingRate(shipping.fetchedShippingRate);
      setCartMemoryCache(userId, {
        cart: nextCart,
        totalShippingRate: shipping.totalShippingRate,
        fetchedShippingRate: shipping.fetchedShippingRate,
      });
      return true;
    };

    const applyPricing = (cartData: CartMap) =>
      userInfo?.country ? syncCartLinePrices(cartData, userInfo) : cartData;

    let hasExistingItems = false;
    setCart((current) => {
      hasExistingItems = Object.keys(current).length > 0;
      return current;
    });

    if (!hasExistingItems) {
      setIsRefreshing(true);
    }

    setError(null);

    if (userId && !accessToken?.trim()) {
      setIsRefreshing(true);
      return;
    }

    if (!userId) {
      try {
        const guestCart = applyPricing(await loadGuestCart());
        if (hasLocalCartEdits()) {
          const memoryCart = normalizeCartMap(readCartMemoryMap(userId) ?? {});
          applyLoadedCart(memoryCart, ZERO_SHIPPING_RATES);
          return;
        }
        const lineShippingTotal = getCartShippingTotal(guestCart);
        const normalizedShipping = normalizeStoredShippingRates(
          guestCart,
          lineShippingTotal,
          lineShippingTotal,
          userInfo?.currencyRate ?? 1,
        );
        applyLoadedCart(guestCart, normalizedShipping);
      } catch (err) {
        if (!hasExistingItems) {
          setCart({});
          setError(getErrorMessage(err, 'Failed to load cart'));
        } else {
          setError(getErrorMessage(err, 'Unable to refresh cart. Showing saved items.'));
        }
      } finally {
        setIsRefreshing(false);
      }
      return;
    }

    try {
      const response = await loadUserCart(userId);
      if (hasLocalCartEdits()) {
        const memoryCart = normalizeCartMap(readCartMemoryMap(userId) ?? {});
        applyLoadedCart(memoryCart, ZERO_SHIPPING_RATES);
        return;
      }
      const nextCart = applyPricing(response.cart ?? {});
      const normalizedShipping = normalizeStoredShippingRates(
        nextCart,
        response.totalShippingRate ?? 0,
        response.fetchedShippingRate ?? 0,
        userInfo?.currencyRate ?? 1,
      );
      applyLoadedCart(nextCart, normalizedShipping);
    } catch (err) {
      if (mutationAtStart !== cartMutationRef.current) {
        return;
      }

      if (!hasExistingItems) {
        setCart({});
        setError(getErrorMessage(err, 'Failed to load cart'));
      } else {
        setError(getErrorMessage(err, 'Unable to refresh cart. Showing saved items.'));
      }
    } finally {
      if (mutationAtStart === cartMutationRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [accessToken, userId, userInfo]);

  useEffect(() => {
    const cached = getCartMemoryCache(userId);
    if (cached) {
      const cachedCart = normalizeCartMap(cached.cart);
      setCart(cachedCart);
      setTotalShippingRate(cached.totalShippingRate);
      setFetchedShippingRate(cached.fetchedShippingRate);
      setIsRefreshing(Object.keys(cachedCart).length === 0);
      return;
    }

    setCart({});
    setTotalShippingRate(0);
    setFetchedShippingRate(0);
    setIsRefreshing(true);
  }, [userId]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  useEffect(() => subscribeCartRefresh(() => {
    const cached = getCartMemoryCache(userId);
    if (cached) {
      setCart(normalizeCartMap(cached.cart));
      setTotalShippingRate(cached.totalShippingRate);
      setFetchedShippingRate(cached.fetchedShippingRate);
      setIsRefreshing(false);
      return;
    }

    void loadCart();
  }), [loadCart, userId]);

  const removeItem = useCallback(
    async (itemId: string) => {
      setRemovingItemId(itemId);
      setError(null);

      bumpCartMutation();

      const current = latestCartRef.current;
      const removedLine = current[itemId];
      if (!removedLine) {
        setRemovingItemId(null);
        return;
      }

      const bookingRef = removedLine.bookingDetails?.bookingRef;
      const productId = removedLine.productData?._id?.trim();
      const isCustomizable = removedLine.productData?.productType === 'Customizable';

      let workingCart = removeCartLine(current, itemId);
      if (productId && !isCustomizable) {
        for (const key of Object.keys(workingCart)) {
          const line = workingCart[key];
          if (line?.productData?._id?.trim() === productId) {
            workingCart = removeCartLine(workingCart, key);
          }
        }
      }

      const nextCart = invalidateCartShipping(workingCart);

      latestCartRef.current = nextCart;
      setCart(nextCart);
      setTotalShippingRate(ZERO_SHIPPING_RATES.totalShippingRate);
      setFetchedShippingRate(ZERO_SHIPPING_RATES.fetchedShippingRate);
      setCartMemoryCache(userId, {
        cart: nextCart,
        ...ZERO_SHIPPING_RATES,
      });
      clearCachedShippingRates();

      try {
        if (bookingRef && accessToken) {
          try {
            await releaseServiceBookingHold(bookingRef, accessToken);
          } catch {
            /* best-effort release */
          }
        }

        await writeCartToStorage(userId, nextCart, ZERO_SHIPPING_RATES);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to remove item from cart'));
      } finally {
        notifyCartChanged();
        setRemovingItemId(null);
      }
    },
    [accessToken, bumpCartMutation, userId],
  );

  const addServiceAppointment = useCallback(
    async (hold: ServiceSlotSelectionHold, service: Product) => {
      if (!userInfo) {
        throw new ServiceCartValidationError('Unable to add appointment right now.');
      }
      setError(null);
      try {
        const result = await persistServiceAppointment(userId, hold, service, userInfo);
        const cached = getCartMemoryCache(userId);
        if (cached) {
          setCart(normalizeCartMap(cached.cart));
          setTotalShippingRate(ZERO_SHIPPING_RATES.totalShippingRate);
          setFetchedShippingRate(ZERO_SHIPPING_RATES.fetchedShippingRate);
        }
        return result;
      } catch (err) {
        const message =
          err instanceof ServiceCartValidationError
            ? err.message
            : getErrorMessage(err, 'Failed to add appointment');
        setError(message);
        throw err;
      }
    },
    [userId, userInfo],
  );

  const updateQuantity = useCallback(
    async (itemId: string, nextQuantity: number) => {
      if (nextQuantity < 1) {
        await removeItem(itemId);
        return;
      }

      setUpdatingItemId(itemId);
      setError(null);

      bumpCartMutation();

      let nextCart: CartMap;
      try {
        nextCart = invalidateCartShipping(
          updateCartLineQuantity(latestCartRef.current, itemId, nextQuantity),
        );
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update cart quantity'));
        setUpdatingItemId(null);
        return;
      }

      latestCartRef.current = nextCart;
      setCart(nextCart);
      setTotalShippingRate(ZERO_SHIPPING_RATES.totalShippingRate);
      setFetchedShippingRate(ZERO_SHIPPING_RATES.fetchedShippingRate);
      setCartMemoryCache(userId, {
        cart: nextCart,
        ...ZERO_SHIPPING_RATES,
      });
      clearCachedShippingRates();

      try {
        await writeCartToStorage(userId, nextCart, ZERO_SHIPPING_RATES);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update cart quantity'));
      } finally {
        notifyCartChanged();
        setUpdatingItemId(null);
      }
    },
    [bumpCartMutation, removeItem, userId],
  );

  const updateVariations = useCallback(
    async (itemId: string, selectedVariations: VariationAttributeSelection[]) => {
      if (!userInfo) {
        setError('Unable to update options right now.');
        return null;
      }

      setUpdatingItemId(itemId);
      setError(null);

      let nextCart: CartMap | null = null;
      let nextCartKey: string | null = null;

      bumpCartMutation();

      try {
        setCart((currentCart) => {
          const { cart: replacedCart, cartKey } = replaceCartLineVariations(
            currentCart,
            itemId,
            selectedVariations,
            userInfo,
          );
          nextCartKey = cartKey;
          nextCart = invalidateCartShipping(replacedCart);
          return nextCart;
        });

        if (!nextCart) {
          return null;
        }

        setTotalShippingRate(ZERO_SHIPPING_RATES.totalShippingRate);
        setFetchedShippingRate(ZERO_SHIPPING_RATES.fetchedShippingRate);
        setCartMemoryCache(userId, {
          cart: nextCart,
          ...ZERO_SHIPPING_RATES,
        });

        if (userId) {
          await persistCart(userId, nextCart, ZERO_SHIPPING_RATES);
        } else {
          await saveGuestCart(nextCart);
        }

        notifyCartChanged();
        return nextCartKey;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update product options'));
        throw err;
      } finally {
        setUpdatingItemId(null);
      }
    },
    [bumpCartMutation, userId, userInfo],
  );

  const replaceCart = useCallback(
    (nextCart: CartMap, options?: { bumpMutation?: boolean }) => {
      if (options?.bumpMutation) {
        bumpCartMutation();
      }
      setCart(nextCart);
      setCartMemoryCache(userId, {
        cart: nextCart,
        totalShippingRate,
        fetchedShippingRate,
      });
    },
    [bumpCartMutation, fetchedShippingRate, totalShippingRate, userId],
  );

  const setShippingTotals = useCallback((total: number, fetched: number) => {
    setTotalShippingRate(total);
    setFetchedShippingRate(fetched);

    const cached = getCartMemoryCache(userId);
    if (cached) {
      setCartMemoryCache(userId, {
        cart: normalizeCartMap(cached.cart),
        totalShippingRate: total,
        fetchedShippingRate: fetched,
      });
    }
  }, [userId]);

  const entries = useMemo(() => getCartEntries(cart), [cart]);
  const subTotal = useMemo(() => calculateSubTotal(cart), [cart]);
  const isLoading = isRefreshing && entries.length === 0;

  return {
    cart,
    entries,
    subTotal,
    totalShippingRate,
    fetchedShippingRate,
    isRefreshing,
    isLoading,
    error,
    removingItemId,
    updatingItemId,
    retry: loadCart,
    removeItem,
    updateQuantity,
    updateVariations,
    replaceCart,
    setShippingTotals,
    addServiceAppointment,
    getLatestCart,
    getCartLineKeys,
  };
}

export type CartState = ReturnType<typeof useCartState>;
