import { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isStripeCardCheckoutSupported,
  isStripePlatformPaySupported,
} from '../../../app/utils/isStripeNativeSupported';
import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { spacing, colors } from '../../../design-system';
import { usePricing } from '../../../app/providers/PricingProvider';
import {
  marketplaceScrollProps,
  useMarketplaceScrollHandler,
} from '../../../app/navigation/marketplaceChrome';
import { navigateToCartTab } from '../../../app/navigation/shoppingNavigation';
import type { RootStackParamList, ShoppingStackParamList } from '../../../app/navigation/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { useRequireCheckoutAccess } from '../hooks/useRequireCheckoutAccess';
import { resolveAuthUserId } from '../../auth/utils/resolveAuthUserId';
import { useCart } from '../../cart/hooks/useCart';
import { useClearCartOnSuccessfulCheckout } from '../../cart/hooks/useClearCartOnSuccessfulCheckout';
import { useAppliedCoupon } from '../../cart/hooks/useAppliedCoupon';
import { getCartSubtotalCad } from '../../cart/utils/cartPricing';
import { calculateCartTotals } from '../../cart/utils/cartTotals';
import {
  isCartShippingPending,
  resolveCartShippingCad,
  resolveCartShippingOptions,
} from '../../cart/utils/resolveCartShipping';
import { resolveWebParityShippingTotal } from '../utils/buildCheckoutOrderPayload';
import { CheckoutStepIndicator } from '../components/CheckoutStepIndicator';
import { CheckoutProcessingLoader } from '../components/CheckoutProcessingLoader';
import { PaymentEditCartLink } from '../components/PaymentEditCartLink';
import { KorapayCheckoutWebView } from '../components/KorapayCheckoutWebView';
import { OrderSuccessSheet } from '../components/OrderSuccessSheet';
import type { PaymentMethodId } from '../components/PaymentMethodOption';
import { PaymentMethodPicker, type PaymentMethodPickerItem } from '../components/PaymentMethodPicker';
import { PaymentMethodPickerFooter } from '../components/PaymentMethodPickerFooter';
import { PaymentScreenHeader } from '../components/PaymentScreenHeader';
import { usesKorapayCheckout } from '../constants/checkoutPaymentMethods';
import {
  cartAllowsPayAtVenue,
  cartShouldShowOnlinePaymentMethods,
} from '../../services/utils/servicePaymentOptions';
import { useCheckoutShippingAddress } from '../hooks/useCheckoutShippingAddress';
import {
  formatCheckoutPaymentFailure,
  getCheckoutPaymentErrorMessage,
  isPayPalReturnRouteParams,
  useCheckoutPayment,
} from '../hooks/useCheckoutPayment';

import { useGuestCheckoutIdentity } from '../hooks/useGuestCheckoutIdentity';
import type { CheckoutOrderParams } from '../utils/buildCheckoutOrderPayload';
import { maskEmail } from '../utils/maskEmail';
import { resolveCapturedOrderId } from '../utils/resolveCapturedOrderId';
import {
  resetStackAfterCheckoutToHome,
  resetStackAfterCheckoutToOrderDetail,
  resetStackAfterCheckoutToOrders,
} from '../utils/checkoutCompletionNavigation';
import { requestMarketplaceHomeRefresh } from '../../home/state/marketplaceHomeRefresh';
import { primeAccessTokenInMemory } from '../../../services/storage/secureStorage';
import { cartHasShippableItems } from '../utils/buildCheckoutOrderPayload';
import {
  validateCheckoutContactAddress,
  validateShippingAddress,
} from '../utils/validateShippingAddress';
import {
  buildCheckoutPaymentFooterButtonLabel,
  buildCheckoutPaymentPickerHint,
  buildCheckoutPaymentProceedHint,
  resolveSelectedPaymentMethodOption,
} from '../utils/checkoutPaymentDisplay';

type Props = NativeStackScreenProps<ShoppingStackParamList, 'Payment'>;

type PaymentNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ShoppingStackParamList, 'Payment'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const PAYMENT_RETURN_TO = authReturnTo.payment();

export function PaymentScreen(props: Props) {
  return <PaymentScreenBody {...props} />;
}

function PaymentScreenBody({ route }: Props) {
  const insets = useSafeAreaInsets();
  const onMarketplaceScroll = useMarketplaceScrollHandler();
  const navigation = useNavigation<PaymentNavigationProp>();
  const { user, isAuthenticated } = useAuth();
  const { isAuthorized } = useRequireCheckoutAccess(PAYMENT_RETURN_TO);
  const authUserId = resolveAuthUserId(user);
  const { userInfo } = usePricing();
  const currency = userInfo.currency ?? 'CAD';
  const currencyRate = userInfo.currencyRate ?? 1;
  const stripeConfigured = isStripeCardCheckoutSupported();
  const applePayBuildReady = isStripePlatformPaySupported();

  const { cart, entries, isLoading, error, retry, totalShippingRate, fetchedShippingRate } =
    useCart();
  const { appliedCoupon, removeAppliedCoupon } = useAppliedCoupon(authUserId);
  const { shippingAddress } = useCheckoutShippingAddress(user);
  const { resolveIdentityForAddress, establishGuestCheckout, isEstablishingGuest, guestError } =
    useGuestCheckoutIdentity(user);
  const checkoutPayment = useCheckoutPayment();
  const {
    isProcessing,
    isCapturing,
    prepareStripeCardCheckout,
    orderError,
    captureError,
    checkoutNotice,
    captureResult,
    korapaySession,
    applePaySupported,
    checkApplePaySupport,
    startPayPalCheckout,
    startKorapayCheckout,
    completeKorapayCheckout,
    cancelKorapayCheckout,
    startStripeCardCheckout,
    startApplePayCheckout,
    startPayAtVenueCheckout,
    retryCaptureForCreatedOrder,
    resumePayPalFromRouteParams,
    createdOrderId,
    isPayPalBrowserPending,
    isPayPalCapturing,
    isPayPalResuming,
    isStripeConfirming,
    isPrePaymentProcessing,
  } = checkoutPayment;

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>('paypal');
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const hasPayPalReturnParams = isPayPalReturnRouteParams(route.params);

  const paymentError = getCheckoutPaymentErrorMessage(
    orderError,
    captureError,
    checkoutNotice,
    Boolean(captureResult),
  );

  const isConfirmingOrder =
    isCapturing || isPayPalCapturing || isPayPalResuming || isStripeConfirming;

  const showOrderSuccess = Boolean(captureResult);

  const showProcessingOverlay =
    !paymentError &&
    !showOrderSuccess &&
    (hasPayPalReturnParams ||
      isConfirmingOrder ||
      isPrePaymentProcessing ||
      isPayPalBrowserPending);

  const hidePaymentFooter =
    showOrderSuccess || isConfirmingOrder || isPayPalBrowserPending || isPrePaymentProcessing;

  useEffect(() => {
    void resumePayPalFromRouteParams(route.params);
  }, [resumePayPalFromRouteParams, route.params]);

  useEffect(() => {
    if (!captureResult || !authUserId) {
      return;
    }

    void removeAppliedCoupon();
  }, [authUserId, captureResult, removeAppliedCoupon]);

  useClearCartOnSuccessfulCheckout(captureResult, cart, authUserId);

  useEffect(() => {
    void checkApplePaySupport();
  }, [checkApplePaySupport]);

  const showKorapay = usesKorapayCheckout(currency);

  useEffect(() => {
    if (showKorapay && selectedPayment === 'stripe') {
      setSelectedPayment('korapay');
      return;
    }

    if (!showKorapay && selectedPayment === 'korapay') {
      setSelectedPayment('stripe');
    }
  }, [selectedPayment, showKorapay]);

  const subtotalCad = useMemo(() => getCartSubtotalCad(cart, userInfo), [cart, userInfo]);
  const selectedShippingOptions = useMemo(() => resolveCartShippingOptions(cart), [cart]);
  const shippingCad = useMemo(
    () =>
      resolveCartShippingCad(
        cart,
        totalShippingRate,
        fetchedShippingRate,
        selectedShippingOptions,
        currencyRate,
      ),
    [cart, currencyRate, fetchedShippingRate, selectedShippingOptions, totalShippingRate],
  );

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const requiresPhysicalShipping = useMemo(() => cartHasShippableItems(cart), [cart]);
  const shippingPending =
    requiresPhysicalShipping && isCartShippingPending(cart, selectedShippingOptions);
  const payAtVenueEligible = useMemo(() => cartAllowsPayAtVenue(cart), [cart]);
  const showOnlinePaymentMethods = useMemo(
    () => cartShouldShowOnlinePaymentMethods(cart),
    [cart],
  );
  const showPaymentMethodPicker = !showOrderSuccess;

  const checkoutIdentity = useMemo(
    () => resolveIdentityForAddress(shippingAddress),
    [resolveIdentityForAddress, shippingAddress],
  );
  const payerEmail = shippingAddress.email || user?.email || checkoutIdentity?.email;
  const maskedPayerEmail = maskEmail(payerEmail);

  const paymentMethods = useMemo((): PaymentMethodPickerItem[] => {
    const stripeEnabled = !showKorapay && stripeConfigured && showOnlinePaymentMethods;
    const korapayEnabled = showKorapay && showOnlinePaymentMethods;
    const applePayEnabled =
      Platform.OS === 'ios' && applePaySupported && applePayBuildReady && showOnlinePaymentMethods;

    const methods: PaymentMethodPickerItem[] = [];

    if (payAtVenueEligible) {
      methods.push({
        id: 'pay_at_venue',
        label: 'Pay at appointment',
        subtitle: isAuthenticated
          ? 'Pay your provider directly at the appointment'
          : 'Sign in to book with pay at appointment',
        disabled: !isAuthenticated,
        icon: 'calendar-outline',
      });
    }

    if (showOnlinePaymentMethods) {
      if (Platform.OS === 'ios') {
        methods.push({
          id: 'applepay',
          label: 'Apple Pay',
          subtitle: applePayEnabled
            ? 'Fast checkout on iPhone'
            : applePayBuildReady
              ? 'Apple Pay is not available on this device'
              : 'Requires a development build',
          disabled: !applePayEnabled,
          icon: 'logo-apple',
        });
      }

      methods.push({
        id: 'paypal',
        label: 'PayPal',
        subtitle: maskedPayerEmail ?? 'Pay with your PayPal account',
        icon: 'logo-paypal',
        external: true,
      });

      if (!showKorapay) {
        methods.push({
          id: 'stripe',
          label: 'Credit / Debit Card',
          subtitle: stripeConfigured ? 'Visa, Mastercard, and more' : 'Stripe is not configured',
          disabled: !stripeEnabled,
          icon: 'card-outline',
        });
      }

      if (showKorapay) {
        methods.push({
          id: 'korapay',
          label: 'Korapay',
          subtitle: 'Local payment methods for Nigeria and Africa',
          disabled: !korapayEnabled,
          icon: 'wallet-outline',
          external: true,
        });
      }
    }

    return methods;
  }, [
    applePayBuildReady,
    applePaySupported,
    isAuthenticated,
    maskedPayerEmail,
    payAtVenueEligible,
    showOnlinePaymentMethods,
    showKorapay,
    stripeConfigured,
  ]);

  const defaultPaymentMethod = useMemo((): PaymentMethodId => {
    if (payAtVenueEligible && isAuthenticated) {
      return 'pay_at_venue';
    }
    const applePayOption = paymentMethods.find((method) => method.id === 'applepay');
    if (applePayOption && !applePayOption.disabled) {
      return 'applepay';
    }

    return 'paypal';
  }, [isAuthenticated, payAtVenueEligible, paymentMethods]);

  useEffect(() => {
    setSelectedPayment((current) => {
      const currentOption = paymentMethods.find((method) => method.id === current);
      if (currentOption && !currentOption.disabled) {
        return current;
      }

      return defaultPaymentMethod;
    });
  }, [defaultPaymentMethod, paymentMethods]);

  const effectivePaymentMethod = useMemo((): PaymentMethodId => {
    const currentOption = paymentMethods.find((method) => method.id === selectedPayment);
    if (currentOption && !currentOption.disabled) {
      return selectedPayment;
    }
    return defaultPaymentMethod;
  }, [defaultPaymentMethod, paymentMethods, selectedPayment]);

  const selectedPaymentMethodOption = useMemo(
    () => resolveSelectedPaymentMethodOption(paymentMethods, effectivePaymentMethod),
    [effectivePaymentMethod, paymentMethods],
  );

  const paymentPickerIntroHint = useMemo(
    () => buildCheckoutPaymentPickerHint(paymentMethods),
    [paymentMethods],
  );

  const paymentPickerProceedHint = useMemo(
    () => buildCheckoutPaymentProceedHint(selectedPaymentMethodOption),
    [selectedPaymentMethodOption],
  );

  const totals = useMemo(() => {
    const base = calculateCartTotals({
      subtotalCad,
      shippingCad,
      discountDisplay: discountAmount,
      currencyRate,
      shippingPending,
    });
    if (payAtVenueEligible && effectivePaymentMethod === 'pay_at_venue') {
      const displaySubtotal = base.displaySubtotal;
      const displayDiscount = base.displayDiscount;
      const displayShipping = base.displayShipping ?? 0;
      return {
        ...base,
        displayServiceCharge: 0,
        serviceChargeCad: 0,
        displayTotal: Math.max(
          0,
          parseFloat((displaySubtotal - displayDiscount + displayShipping).toFixed(2)),
        ),
      };
    }
    return base;
  }, [
    currencyRate,
    discountAmount,
    effectivePaymentMethod,
    payAtVenueEligible,
    shippingCad,
    shippingPending,
    subtotalCad,
  ]);

  const handleBackPress = () => {
    if (captureResult) {
      resetStackAfterCheckoutToHome(navigation);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigateToCartTab(navigation);
    }
  };

  const buildCheckoutParams = (identity: CheckoutOrderParams['identity']): CheckoutOrderParams => ({
    identity,
    cart,
    shippingAddress,
    selectedOptions: selectedShippingOptions,
    totals: {
      subTotal: subtotalCad,
      shippingTotal: resolveWebParityShippingTotal(
        fetchedShippingRate,
        totalShippingRate,
        shippingCad,
      ),
      grandTotal:
        subtotalCad +
        resolveWebParityShippingTotal(fetchedShippingRate, totalShippingRate, shippingCad) +
        totals.serviceChargeCad -
        discountAmount / (currencyRate > 0 ? currencyRate : 1),
    },
    currency,
    conversionRate: currencyRate,
    couponCode: appliedCoupon?.couponCode,
  });

  useEffect(() => {
    if (
      effectivePaymentMethod !== 'stripe' ||
      !stripeConfigured ||
      shippingPending ||
      totals.displayTotal == null
    ) {
      return;
    }

    const identity = resolveIdentityForAddress(shippingAddress);
    if (!identity) {
      return;
    }

    void prepareStripeCardCheckout(buildCheckoutParams(identity), totals.displayTotal, currency);
  }, [
    effectivePaymentMethod,
    stripeConfigured,
    shippingPending,
    totals.displayTotal,
    currency,
    shippingAddress,
    resolveIdentityForAddress,
    prepareStripeCardCheckout,
    cart,
    appliedCoupon,
    selectedShippingOptions,
    subtotalCad,
    shippingCad,
    discountAmount,
    currencyRate,
    fetchedShippingRate,
    totalShippingRate,
  ]);

  const resolveCheckoutIdentity = async () => {
    if (isAuthenticated && checkoutIdentity) {
      return checkoutIdentity;
    }

    return establishGuestCheckout(shippingAddress);
  };

  const handleConfirmPayment = async () => {
    if (isProcessing || isEstablishingGuest) {
      return;
    }

    setFormNotice(null);

    const addressValidation = requiresPhysicalShipping
      ? validateShippingAddress(shippingAddress)
      : validateCheckoutContactAddress(shippingAddress);
    if (!addressValidation.isValid) {
      setFormNotice(
        requiresPhysicalShipping
          ? 'Complete delivery details on the cart before paying.'
          : 'Add your contact details on the cart before paying.',
      );
      return;
    }

    if (shippingPending) {
      setFormNotice('Select shipping options on the cart before paying.');
      return;
    }

    if (totals.displayTotal == null) {
      setFormNotice('Order total is not ready yet.');
      return;
    }

    const selectedMethod = paymentMethods.find((method) => method.id === effectivePaymentMethod);
    if (!selectedMethod || selectedMethod.disabled) {
      setFormNotice('Select an available payment method.');
      return;
    }

    try {
      const identity = await resolveCheckoutIdentity();
      const checkoutParams = buildCheckoutParams(identity);

      switch (effectivePaymentMethod) {
        case 'pay_at_venue':
          await startPayAtVenueCheckout(checkoutParams);
          break;
        case 'paypal':
          await startPayPalCheckout(checkoutParams);
          break;
        case 'stripe':
          await startStripeCardCheckout(checkoutParams, totals.displayTotal, currency);
          break;
        case 'korapay':
          await startKorapayCheckout(checkoutParams);
          break;
        case 'applepay':
          await startApplePayCheckout(checkoutParams, totals.displayTotal, currency);
          break;
        default:
          setFormNotice('This payment method is not available.');
      }
    } catch (err) {
      setFormNotice(formatCheckoutPaymentFailure(err, 'Failed to process payment'));
    }
  };

  const capturedOrderId = useMemo(() => resolveCapturedOrderId(captureResult), [captureResult]);

  const handleTrackOrder = () => {
    primeAccessTokenInMemory(user?.accessToken);
    if (capturedOrderId) {
      resetStackAfterCheckoutToOrderDetail(navigation, capturedOrderId);
      return;
    }

    resetStackAfterCheckoutToOrders(navigation);
  };

  const handleContinueShopping = () => {
    primeAccessTokenInMemory(user?.accessToken);
    requestMarketplaceHomeRefresh();
    resetStackAfterCheckoutToHome(navigation);
  };

  const paymentFlowActive = Boolean(korapaySession);
  const payAtVenueBooking =
    payAtVenueEligible && effectivePaymentMethod === 'pay_at_venue';
  const footerPayLabel = buildCheckoutPaymentFooterButtonLabel({
    selected: selectedPaymentMethodOption,
    currency,
    total: totals.displayTotal,
    shippingPending,
    continueLoading: isPrePaymentProcessing && !isPayPalBrowserPending,
    continueLoadingLabel: 'Processing…',
    payAtVenueBooking,
  });

  if (!isAuthorized) {
    return (
      <View style={[styles.centeredState, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandBlue} />
      </View>
    );
  }

  if (isLoading && !showOrderSuccess) {
    return (
      <View style={[styles.centeredState, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandBlue} />
        <AppText variant="bodySmall" color="textMuted">
          Loading payment...
        </AppText>
      </View>
    );
  }

  if (error && !showOrderSuccess) {
    return (
      <View style={[styles.centeredState, { paddingTop: insets.top }]}>
        <AppText variant="bodySmall" color="error">
          {error}
        </AppText>
        <AppButton label="Try again" onPress={() => void retry()} />
      </View>
    );
  }

  if (entries.length === 0 && !showOrderSuccess) {
    return (
      <View style={[styles.centeredState, { paddingTop: insets.top }]}>
        <AppText variant="h2">Nothing to pay for</AppText>
        <AppText variant="body" color="textSecondary" style={styles.centeredCopy}>
          Your cart is empty. Add items before checkout.
        </AppText>
        <AppButton label="Back to cart" onPress={() => navigateToCartTab(navigation)} fullWidth />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View
        style={[
          styles.checkoutBody,
          showProcessingOverlay ? styles.processingHiddenContent : undefined,
        ]}
        pointerEvents={showProcessingOverlay ? 'none' : 'auto'}
      >
      <PaymentScreenHeader onBack={handleBackPress} />

      <View style={styles.stepsWrap}>
        <CheckoutStepIndicator currentStep="payment" />
      </View>

      {showOrderSuccess ? (
        <View style={styles.successBackdrop} />
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onMarketplaceScroll}
        {...marketplaceScrollProps}
      >
        <PaymentEditCartLink onPress={() => navigateToCartTab(navigation)} />

        {showPaymentMethodPicker && paymentMethods.length > 0 ? (
          <PaymentMethodPicker
            methods={paymentMethods}
            selectedMethod={effectivePaymentMethod}
            onSelectMethod={setSelectedPayment}
            introHint={paymentPickerIntroHint}
            proceedHint={paymentPickerProceedHint}
          />
        ) : showPaymentMethodPicker ? (
          <AppCard variant="flat">
            <AppText variant="bodyMedium" style={styles.paymentErrorTitle}>
              No payment methods available
            </AppText>
            <AppText variant="bodySmall" color="textSecondary">
              This cart cannot be paid online. Edit your cart or choose a different booking option.
            </AppText>
          </AppCard>
        ) : null}

        {shippingPending ? (
          <AppText variant="bodySmall" color="error">
            Shipping is not ready yet. Go back to the cart and select a delivery option.
          </AppText>
        ) : null}
        {guestError ? (
          <AppText variant="bodySmall" color="error">
            {guestError}
          </AppText>
        ) : null}
        {paymentError ? (
          <AppCard variant="flat" style={styles.paymentErrorCard}>
            <AppText variant="bodyMedium" color="error" style={styles.paymentErrorTitle}>
              Payment could not be completed
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.paymentErrorMessage}>
              {paymentError}
            </AppText>
          </AppCard>
        ) : null}
        {createdOrderId && captureError && !captureResult ? (
          <AppButton
            label="Confirm PayPal payment"
            variant="primary"
            onPress={() => void retryCaptureForCreatedOrder()}
            loading={isPayPalCapturing}
          />
        ) : null}
        {formNotice ? (
          <AppText variant="bodySmall" color="error">
            {formNotice}
          </AppText>
        ) : null}
      </ScrollView>
      )}

      {!hidePaymentFooter ? (
        <PaymentMethodPickerFooter
          currency={currency}
          total={totals.displayTotal}
          shippingPending={shippingPending}
          selectedMethodLabel={selectedPaymentMethodOption?.label ?? null}
          payLabel={footerPayLabel}
          onContinue={() => void handleConfirmPayment()}
          continueDisabled={
            !selectedPaymentMethodOption ||
            paymentMethods.length === 0 ||
            totals.displayTotal == null ||
            paymentFlowActive ||
            isProcessing ||
            isEstablishingGuest
          }
          continueLoading={isPrePaymentProcessing && !isPayPalBrowserPending}
          continueLoadingLabel="Processing…"
          hasFooterTabs
        />
      ) : null}
      </View>

      <KorapayCheckoutWebView
        visible={Boolean(korapaySession)}
        checkoutUrl={korapaySession?.checkoutUrl ?? null}
        onComplete={() => void completeKorapayCheckout()}
        onCancel={cancelKorapayCheckout}
      />

      <CheckoutProcessingLoader
        overlay
        presentation="layer"
        visible={showProcessingOverlay}
      />

      <OrderSuccessSheet
        visible={showOrderSuccess}
        onTrackOrder={handleTrackOrder}
        onContinueShopping={handleContinueShopping}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  checkoutBody: {
    flex: 1,
  },
  processingHiddenContent: {
    opacity: 0,
  },
  scroll: {
    flex: 1,
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stepsWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  centeredState: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  centeredCopy: {
    textAlign: 'center',
  },
  paymentErrorCard: {
    borderColor: colors.error,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  paymentErrorTitle: {
    fontWeight: '700',
  },
  paymentErrorMessage: {
    lineHeight: 20,
  },
});
