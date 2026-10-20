import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePricing } from '../../../app/providers/PricingProvider';
import { saveGuestCart } from '../../../services/storage/cartStorage';
import type { CartMap } from '../../../services/types/cart';
import type { AuthUser } from '../../auth/types';
import { useGuestCheckoutIdentity } from '../../checkout/hooks/useGuestCheckoutIdentity';
import { useAuthenticatedShippingAddress } from '../../checkout/hooks/useAuthenticatedShippingAddress';
import { useCheckoutShippingRates } from '../../checkout/hooks/useCheckoutShippingRates';
import {
  emptyShippingAddress,
  type ShippingAddress,
} from '../../checkout/types/shippingAddress';
import {
  mapSavedUserAddressToShippingAddress,
  mergeShippingAddress,
} from '../../checkout/utils/mapUserProfileToShippingAddress';
import { cartHasShippableItems } from '../../checkout/utils/buildCheckoutOrderPayload';
import {
  validateCheckoutContactAddress,
  validateShippingAddress,
} from '../../checkout/utils/validateShippingAddress';
import { saveSelectedDeliveryAddress } from '../../../services/storage/selectedDeliveryAddressStorage';
import type { SavedUserAddress } from '../../../services/api/usersApi';
import {
  applyShippingSelectionsToCart,
  getCartShippingTotal,
} from '../utils/applyShippingToCart';
import {
  computePersistedShippingTotals,
  isCartShippingPending,
} from '../utils/resolveCartShipping';
import {
  guestProfileToShippingAddress,
  resolveCartShippingContext,
} from '../utils/cartShippingIdentity';
import { persistCart } from '../utils/cartUtils';
import { buildShippingRatesRequestKey } from '../../checkout/utils/shippingRatesRequestKey';

interface UseCartShippingParams {
  cart: CartMap;
  /** Items selected for checkout — shipping rates are calculated for this subset only. */
  checkoutCart?: CartMap;
  user: AuthUser | null;
  authUserId?: string;
  replaceCart: (cart: CartMap, options?: { bumpMutation?: boolean }) => void;
  setShippingTotals: (total: number, fetched: number) => void;
  getCartLineKeys: () => string;
  getLatestCart: () => CartMap;
}

export function useCartShipping({
  cart,
  checkoutCart,
  user,
  authUserId,
  replaceCart,
  setShippingTotals,
  getCartLineKeys,
  getLatestCart,
}: UseCartShippingParams) {
  const ratesCart = checkoutCart ?? cart;
  const { userInfo } = usePricing();
  const guestCheckout = useGuestCheckoutIdentity(user);
  const authShipping = useAuthenticatedShippingAddress(user, authUserId);
  const [guestShippingAddress, setGuestShippingAddress] = useState<ShippingAddress>(emptyShippingAddress());
  const shippingAddress = authUserId ? authShipping.shippingAddress : guestShippingAddress;
  const setShippingAddress = authUserId ? authShipping.setShippingAddress : setGuestShippingAddress;
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [deliveryAddressSheetVisible, setDeliveryAddressSheetVisible] = useState(false);
  const [shippingOptionsSheetVisible, setShippingOptionsSheetVisible] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const lastAppliedSignature = useRef('');
  const cartCompositionKey = useMemo(
    () =>
      Object.entries(cart)
        .map(([itemId, line]) => `${itemId}:${line.orderQuantiy ?? 1}`)
        .sort()
        .join('|'),
    [cart],
  );
  const checkoutCompositionKey = useMemo(
    () =>
      Object.entries(ratesCart)
        .map(([itemId, line]) => `${itemId}:${line.orderQuantiy ?? 1}`)
        .sort()
        .join('|'),
    [ratesCart],
  );

  useEffect(() => {
    if (authUserId) {
      return;
    }

    if (guestCheckout.guestProfile) {
      setGuestShippingAddress(guestProfileToShippingAddress(guestCheckout.guestProfile));
    }
  }, [authUserId, guestCheckout.guestProfile]);

  const requiresPhysicalShipping = useMemo(
    () => cartHasShippableItems(ratesCart),
    [ratesCart],
  );

  const shippingContext = useMemo(() => {
    const context = resolveCartShippingContext({
      user,
      authUserId,
      guestProfile: guestCheckout.guestProfile,
      shippingAddress,
      checkoutCart: ratesCart,
    });

    if (authUserId && authShipping.isLoading) {
      return {
        ...context,
        canFetchRates: false,
        needsDeliveryDetails: false,
      };
    }

    return context;
  }, [authShipping.isLoading, authUserId, guestCheckout.guestProfile, ratesCart, shippingAddress, user]);

  const {
    groups,
    selectedOptionBySeller,
    selectedOptions,
    selectedShippingCost,
    hasMultipleSellers,
    selectOption,
    isLoading,
    isRefreshingRates,
    error,
    loadedGroupsRequestKey,
    retry,
  } = useCheckoutShippingRates(
    ratesCart,
    shippingAddress,
    shippingContext.identity,
    shippingContext.canFetchRates,
    userInfo.country,
    userInfo.currencyRate ?? 1,
    userInfo.currency ?? 'CAD',
  );

  const persistCartShipping = useCallback(
    async (nextCart: CartMap, displayShippingTotal: number) => {
      const scheduledLineKeys = Object.keys(nextCart).sort().join('|');

      const currencyRate = userInfo.currencyRate ?? 1;
      const { totalShippingRate, fetchedShippingRate } = computePersistedShippingTotals(
        displayShippingTotal,
        nextCart,
        currencyRate,
      );

      if (getCartLineKeys() !== scheduledLineKeys) {
        return;
      }

      const liveCart = getLatestCart();
      const liveLineKeys = Object.keys(liveCart).sort().join('|');
      if (liveLineKeys !== scheduledLineKeys) {
        return;
      }

      if (authUserId) {
        await persistCart(authUserId, liveCart, {
          totalShippingRate,
          fetchedShippingRate,
        });
      } else {
        await saveGuestCart(liveCart);
      }

      if (getCartLineKeys() !== scheduledLineKeys) {
        return;
      }

      setShippingTotals(totalShippingRate, fetchedShippingRate);
    },
    [authUserId, getCartLineKeys, getLatestCart, setShippingTotals, userInfo.currencyRate],
  );

  const shippingRatesRequestKey = useMemo(
    () =>
      buildShippingRatesRequestKey(
        ratesCart,
        shippingAddress,
        shippingContext.identity,
        shippingContext.canFetchRates,
        userInfo.country,
      ),
    [
      ratesCart,
      shippingAddress,
      shippingContext.canFetchRates,
      shippingContext.identity,
      userInfo.country,
    ],
  );

  const shippingRatesSynced =
    shippingRatesRequestKey !== 'disabled' &&
    loadedGroupsRequestKey === shippingRatesRequestKey;

  useEffect(() => {
    if (Object.keys(ratesCart).length === 0) {
      return;
    }

    if (
      !shippingContext.canFetchRates ||
      selectedOptions.length === 0 ||
      (isLoading && groups.length === 0) ||
      isCartShippingPending(ratesCart, selectedOptions, groups)
    ) {
      return;
    }

    if (!shippingRatesSynced) {
      return;
    }

    const signature = selectedOptions
      .map((option) => `${option.sellerId}:${option.id}:${option.rate}`)
      .join('|');
    if (signature === lastAppliedSignature.current) {
      return;
    }

    try {
      const nextCart = applyShippingSelectionsToCart(cart, selectedOptions, groups, ratesCart);
      if (nextCart === cart) {
        lastAppliedSignature.current = signature;
        return;
      }

      const shippingTotal = getCartShippingTotal(nextCart) || selectedShippingCost;

      lastAppliedSignature.current = signature;
      replaceCart(nextCart, { bumpMutation: true });
      void persistCartShipping(nextCart, shippingTotal);
    } catch {
      lastAppliedSignature.current = signature;
    }
  }, [
    cart,
    groups,
    isLoading,
    persistCartShipping,
    replaceCart,
    selectedOptions,
    selectedShippingCost,
    shippingContext.canFetchRates,
    shippingRatesSynced,
    ratesCart,
  ]);

  useEffect(() => {
    lastAppliedSignature.current = '';
  }, [
    cartCompositionKey,
    checkoutCompositionKey,
    shippingAddress.city,
    shippingAddress.country,
    shippingAddress.state,
    shippingAddress.streetAddress,
    shippingAddress.zip,
  ]);

  const selectSavedAddress = useCallback(
    async (savedAddress: SavedUserAddress) => {
      await saveSelectedDeliveryAddress(savedAddress);
      const mapped = mapSavedUserAddressToShippingAddress(savedAddress);
      setShippingAddress((current) =>
        mergeShippingAddress(current, {
          ...mapped,
          email: mapped.email || user?.email?.trim() || current.email,
          phone:
            mapped.phone ||
            current.phone ||
            user?.phone?.trim() ||
            user?.moNumber?.trim() ||
            '',
        }),
      );
      lastAppliedSignature.current = '';
      setDeliveryAddressSheetVisible(false);

      if (authUserId) {
        void authShipping.reload();
      }
    },
    [authShipping.reload, authUserId, setShippingAddress, user?.email, user?.moNumber, user?.phone],
  );

  const openDeliveryDetails = useCallback(() => {
    if (user?.accessToken) {
      setAddressModalVisible(false);
      setDeliveryAddressSheetVisible(true);
      return;
    }

    setDeliveryAddressSheetVisible(false);
    setAddressModalVisible(true);
  }, [user?.accessToken]);

  const openShippingOptions = useCallback(() => {
    if (!shippingContext.canFetchRates || isLoading || groups.length === 0) {
      return;
    }

    setShippingOptionsSheetVisible(true);
  }, [groups.length, isLoading, shippingContext.canFetchRates]);

  const confirmShippingOptions = useCallback(
    (selections: Record<string, string>) => {
      Object.entries(selections).forEach(([sellerId, optionId]) => {
        selectOption(sellerId, optionId);
      });
      lastAppliedSignature.current = '';
      setShippingOptionsSheetVisible(false);
    },
    [selectOption],
  );

  const submitDeliveryDetails = useCallback(
    async (address: ShippingAddress) => {
      setIsSavingAddress(true);
      setAddressError(null);

      try {
        const validation = requiresPhysicalShipping
          ? validateShippingAddress(address)
          : validateCheckoutContactAddress(address);
        if (!validation.isValid) {
          throw new Error(
            requiresPhysicalShipping
              ? 'Complete all delivery fields before calculating shipping.'
              : 'Enter your name, email, and phone to continue.',
          );
        }

        setShippingAddress(address);

        if (!authUserId) {
          await guestCheckout.establishGuestCheckout(address);
        }

        setAddressModalVisible(false);
      } catch (err) {
        setAddressError(err instanceof Error ? err.message : 'Failed to save delivery details');
        throw err;
      } finally {
        setIsSavingAddress(false);
      }
    },
    [authUserId, guestCheckout, requiresPhysicalShipping],
  );

  const resolvedShippingCad = selectedShippingCost || getCartShippingTotal(ratesCart);

  const canProceedToCheckout =
    !authShipping.isLoading &&
    !shippingContext.needsDeliveryDetails &&
    !(isLoading && groups.length === 0) &&
    !error &&
    Object.keys(ratesCart).length > 0 &&
    (!requiresPhysicalShipping ||
      (shippingRatesSynced && !isCartShippingPending(ratesCart, selectedOptions, groups)));

  return {
    shippingAddress,
    shippingContext,
    groups,
    selectedOptionBySeller,
    selectedOptions,
    selectedShippingCost,
    hasMultipleSellers,
    selectOption,
    isLoading,
    isRefreshingRates,
    error,
    shippingRatesSynced,
    shippingRatesRequestKey,
    retry,
    addressModalVisible,
    setAddressModalVisible,
    deliveryAddressSheetVisible,
    setDeliveryAddressSheetVisible,
    shippingOptionsSheetVisible,
    setShippingOptionsSheetVisible,
    openDeliveryDetails,
    openShippingOptions,
    confirmShippingOptions,
    selectSavedAddress,
    submitDeliveryDetails,
    isSavingAddress,
    addressError,
    canProceedToCheckout,
    isLoadingAuthAddress: authShipping.isLoading,
    authAddressError: authShipping.error,
    pricingCountry: userInfo.country,
  };
}
