import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useStripeCheckoutActions } from '../../../../app/providers/StripeCheckoutContext';
import { isStripeCardCheckoutSupported } from '../../../../app/utils/isStripeNativeSupported';
import type { AuthStackParamList } from '../../../../app/navigation/types';
import type { SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import { AppButton } from '../../../../components/ui/AppButton';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../../design-system';
import { KorapayCheckoutWebView } from '../../../checkout/components/KorapayCheckoutWebView';
import { resolveKorapayAuthRedirectUrl } from '../../../checkout/utils/resolveKorapayMobileRedirectUrl';
import { AuthFlowScreen } from '../../../auth/components/AuthFlowScreen';
import { useSellerMembershipCheckout } from '../hooks/useSellerMembershipCheckout';
import {
  formatMembershipMoney,
  formatWalletBalance,
} from '../utils/membershipDisplay';
import type {
  MembershipWalletSnapshot,
  SellerBillingCycle,
  SellerMembershipTierId,
} from '../types/sellerMembership';

type CheckoutParams = {
  sellerId: string;
  membershipTier: SellerMembershipTierId;
  billingCycle: SellerBillingCycle;
  email?: string;
  mode?: 'registration' | 'activation' | 'upgrade' | 'renewal';
  walletBalanceCad?: number;
  wallet?: MembershipWalletSnapshot;
};

type Props =
  | NativeStackScreenProps<AuthStackParamList, 'SellerMembershipCheckout'>
  | NativeStackScreenProps<SellerStackParamList, 'SellerMembershipCheckout'>;

export function SellerMembershipCheckoutScreen({ navigation, route }: Props) {
  const params = route.params as CheckoutParams;
  const { sellerId, membershipTier, billingCycle } = params;
  const email = params.email;
  const mode = params.mode ?? 'registration';
  const walletSnapshot = params.wallet ?? null;
  const walletBalanceCad = walletSnapshot?.balanceCad ?? params.walletBalanceCad ?? 0;
  const isUpgrade = mode === 'upgrade';
  const isRenewal = mode === 'renewal';
  const isActivation = mode === 'activation';
  const stackHeaderVisible = mode !== 'registration';
  const screenTitle = useMemo(() => {
    if (isUpgrade) return 'Upgrade plan';
    if (isRenewal) return 'Renew subscription';
    if (isActivation) return 'Activate subscription';
    return 'Complete payment';
  }, [isActivation, isRenewal, isUpgrade]);

  useLayoutEffect(() => {
    if (stackHeaderVisible) {
      navigation.setOptions({ title: screenTitle });
    }
  }, [navigation, screenTitle, stackHeaderVisible]);

  const stripe = useStripeCheckoutActions();
  const { isProcessing, error, startCheckout, verifyCheckout, clearError, setError } =
    useSellerMembershipCheckout();

  const [applyWalletCredits, setApplyWalletCredits] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [pricingLabel, setPricingLabel] = useState<string | null>(null);
  const [walletCreditLabel, setWalletCreditLabel] = useState<string | null>(null);
  const [originalPriceLabel, setOriginalPriceLabel] = useState<string | null>(null);
  const [korapayVisible, setKorapayVisible] = useState(false);
  const [checkoutStarted, setCheckoutStarted] = useState(false);

  const handleSuccess = () => {
    if (isUpgrade || isRenewal || isActivation) {
      navigation.goBack();
      return;
    }

    (navigation as NativeStackScreenProps<AuthStackParamList, 'SellerMembershipCheckout'>['navigation']).replace(
      'RegistrationSuccess',
      {
        accountType: 'seller',
        membershipActivated: true,
      },
    );
  };

  const runCheckout = async () => {
    const session = await startCheckout({
      sellerId,
      membershipTier,
      billingCycle,
      redirectUrl: resolveKorapayAuthRedirectUrl(),
      mode,
      applyWalletCredits,
    });

    if (!session) return;

    if (session.walletOnly && session.completed) {
      handleSuccess();
      return;
    }

    setReference(session.reference);
    setPricingLabel(
      session.pricing
        ? formatMembershipMoney(session.pricing.amountLocal, session.pricing.currency)
        : null,
    );
    setWalletCreditLabel(
      session.walletCredit
        ? formatMembershipMoney(
            session.walletCredit.walletAppliedLocal,
            session.walletCredit.walletCurrency || session.pricing?.currency || 'CAD',
          )
        : null,
    );
    setOriginalPriceLabel(
      session.walletCredit
        ? formatMembershipMoney(
            session.walletCredit.originalAmountLocal,
            session.pricing?.currency || 'CAD',
          )
        : null,
    );

    if (session.provider === 'korapay' && session.checkoutUrl) {
      setCheckoutUrl(session.checkoutUrl);
      setKorapayVisible(true);
      return;
    }

    if (session.provider === 'stripe' && session.clientSecret && stripe) {
      const initResult = await stripe.initPaymentSheet({
        merchantDisplayName: 'AFOMA Marketplace',
        paymentIntentClientSecret: session.clientSecret,
        defaultBillingDetails: email ? { email } : undefined,
        allowsDelayedPaymentMethods: false,
      });

      if (initResult.error) {
        setError(initResult.error.message || 'Failed to initialize payment sheet');
        return;
      }

      const presentResult = await stripe.presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code !== 'Canceled') {
          setError(presentResult.error.message || 'Payment failed');
        }
        return;
      }

      const verified = await verifyCheckout(session.reference);
      if (verified) {
        handleSuccess();
      }
    }
  };

  useEffect(() => {
    if (checkoutStarted) return;
    if (walletBalanceCad > 0) return;
    setCheckoutStarted(true);
    void runCheckout();
  }, [checkoutStarted, walletBalanceCad]);

  const handleKorapayComplete = async (completedReference: string) => {
    setKorapayVisible(false);
    setCheckoutUrl(null);
    const verified = await verifyCheckout(completedReference);
    if (verified) {
      handleSuccess();
    }
  };

  const handleKorapayCancel = () => {
    setKorapayVisible(false);
    setCheckoutUrl(null);
    clearError();
  };

  const handleRetry = async () => {
    setCheckoutStarted(false);
    setCheckoutUrl(null);
    setReference(null);
    setKorapayVisible(false);
    clearError();
  };

  const showWalletOption = walletBalanceCad > 0;

  return (
    <>
      <AuthFlowScreen
        title={
          isUpgrade
            ? 'Upgrade your plan'
            : isRenewal
              ? 'Renew your subscription'
              : isActivation
                ? 'Activate your subscription'
                : 'Complete subscription payment'
        }
        subtitle={
          isUpgrade
            ? 'Confirm payment to switch to your new plan. Your previous subscription will be replaced.'
            : isRenewal
              ? 'Pay the remaining balance or apply My Wallet credits.'
              : isActivation
                ? 'Complete payment to activate your seller subscription and unlock paid plan features.'
                : 'Your seller account stays pending until this subscription payment is confirmed.'
        }
        onBack={() => navigation.goBack()}
        showBackButton={!stackHeaderVisible}
      >
        <View style={styles.box}>
          {showWalletOption ? (
            <View style={styles.walletCard}>
              <AppText variant="bodySmall" color="textSecondary">
                My Wallet balance: {formatWalletBalance(walletSnapshot)}
              </AppText>
              <Pressable
                style={styles.walletToggle}
                onPress={() => {
                  if (isProcessing || checkoutStarted) return;
                  setApplyWalletCredits((value) => !value);
                }}
                disabled={isProcessing || checkoutStarted}
              >
                <View style={[styles.checkbox, applyWalletCredits && styles.checkboxChecked]} />
                <AppText variant="bodySmall" style={styles.walletCopy}>
                  Apply My Wallet credits to this payment only. Leave unchecked to pay the full
                  subscription amount today.
                </AppText>
              </Pressable>
              {!checkoutStarted ? (
                <AppButton
                  label={applyWalletCredits ? 'Pay with wallet credits' : 'Pay full amount'}
                  fullWidth
                  size="lg"
                  shape="pill"
                  onPress={() => {
                    setCheckoutStarted(true);
                    void runCheckout();
                  }}
                  disabled={isProcessing}
                />
              ) : null}
            </View>
          ) : null}

          {originalPriceLabel && walletCreditLabel ? (
            <>
              <AppText variant="bodySmall" color="textSecondary">
                Plan price: {originalPriceLabel}
              </AppText>
              <AppText variant="bodySmall" color="textSecondary">
                Wallet credit: −{walletCreditLabel}
              </AppText>
            </>
          ) : null}

          <AppText variant="body">
            {pricingLabel
              ? `Amount due: ${pricingLabel}`
              : checkoutStarted
                ? 'Preparing secure checkout…'
                : showWalletOption
                  ? 'Choose whether to apply wallet credits, then continue.'
                  : 'Preparing secure checkout…'}
          </AppText>
          {reference ? (
            <AppText variant="caption" color="textSecondary">
              Reference: {reference}
            </AppText>
          ) : null}
          {error ? (
            <AppText variant="bodySmall" color="error" style={styles.error}>
              {error}
            </AppText>
          ) : null}
          {!isStripeCardCheckoutSupported() && !checkoutUrl && checkoutStarted ? (
            <AppText variant="bodySmall" color="textSecondary">
              Stripe is not configured in this build. Use a Korapay-supported country or configure
              EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.
            </AppText>
          ) : null}
        </View>

        <AppButton
          label={isProcessing ? 'Processing…' : 'Retry payment'}
          fullWidth
          size="lg"
          shape="pill"
          variant="outline"
          onPress={() => void handleRetry()}
          disabled={isProcessing}
        />
      </AuthFlowScreen>

      <KorapayCheckoutWebView
        visible={korapayVisible}
        checkoutUrl={checkoutUrl}
        onComplete={(completedReference) => void handleKorapayComplete(completedReference)}
        onCancel={handleKorapayCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  walletCard: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  walletToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  walletCopy: {
    flex: 1,
  },
  error: {
    marginTop: spacing.sm,
  },
});
