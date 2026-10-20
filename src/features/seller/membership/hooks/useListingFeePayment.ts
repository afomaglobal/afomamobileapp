import { useCallback, useRef, useState } from 'react';

import { useStripeCheckoutActions } from '../../../../app/providers/StripeCheckoutContext';
import { isStripeCardCheckoutSupported } from '../../../../app/utils/isStripeNativeSupported';
import { getErrorMessage } from '../../../../services/api/errors';
import {
  createListingFeeCheckout,
  verifyListingFeeCheckout,
} from '../api/sellerMembershipApi';
import { resolveKorapayAuthRedirectUrl } from '../../../checkout/utils/resolveKorapayMobileRedirectUrl';
import type { ProductTierGateError } from '../../products/utils/productTierErrors';
import { formatMembershipMoney } from '../utils/membershipDisplay';

export interface ListingFeePaymentModalProps {
  visible: boolean;
  tierError: ProductTierGateError | null;
  isProcessing: boolean;
  error: string | null;
  checkoutUrl: string | null;
  onPay: () => void;
  onCancel: () => void;
  onKorapayComplete: (reference: string) => void;
  onKorapayCancel: () => void;
}

export function useListingFeePayment(sellerId: string | undefined) {
  const stripe = useStripeCheckoutActions();
  const [visible, setVisible] = useState(false);
  const [tierError, setTierError] = useState<ProductTierGateError | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const finish = useCallback((value: string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setVisible(false);
    setTierError(null);
    setCheckoutUrl(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  const requestListingFeePayment = useCallback(
    (gateError: ProductTierGateError): Promise<string | null> => {
      if (!sellerId) {
        return Promise.resolve(null);
      }

      setTierError(gateError);
      setVisible(true);
      setError(null);
      setCheckoutUrl(null);

      return new Promise<string | null>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [sellerId],
  );

  const runStripePayment = useCallback(
    async (clientSecret: string, reference: string) => {
      if (!stripe) {
        setError('Card payments are not available in this build.');
        return;
      }

      const initResult = await stripe.initPaymentSheet({
        merchantDisplayName: 'AFOMA Marketplace',
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: false,
      });

      if (initResult.error) {
        setError(initResult.error.message || 'Failed to initialize payment');
        return;
      }

      const presentResult = await stripe.presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code !== 'Canceled') {
          setError(presentResult.error.message || 'Payment failed');
        }
        return;
      }

      const verified = await verifyListingFeeCheckout(reference);
      finish(verified.listingFeePaymentRef);
    },
    [finish, stripe],
  );

  const handlePay = useCallback(async () => {
    if (!sellerId || !tierError?.listingFee) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const session = await createListingFeeCheckout({
        sellerId,
        redirectUrl: resolveKorapayAuthRedirectUrl(),
      });

      if (session.provider === 'korapay' && session.checkoutUrl) {
        setCheckoutUrl(session.checkoutUrl);
        return;
      }

      if (session.provider === 'stripe' && session.clientSecret && session.reference) {
        await runStripePayment(session.clientSecret, session.reference);
        return;
      }

      setError('Unable to start listing fee checkout.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to start listing fee payment'));
    } finally {
      setIsProcessing(false);
    }
  }, [runStripePayment, sellerId, tierError?.listingFee]);

  const handleKorapayComplete = useCallback(
    async (reference: string) => {
      setIsProcessing(true);
      setError(null);
      setCheckoutUrl(null);

      try {
        const verified = await verifyListingFeeCheckout(reference);
        finish(verified.listingFeePaymentRef);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to verify listing fee payment'));
      } finally {
        setIsProcessing(false);
      }
    },
    [finish],
  );

  const handleCancel = useCallback(() => {
    finish(null);
  }, [finish]);

  const modalProps: ListingFeePaymentModalProps = {
    visible,
    tierError,
    isProcessing,
    error,
    checkoutUrl,
    onPay: () => void handlePay(),
    onCancel: handleCancel,
    onKorapayComplete: (reference) => void handleKorapayComplete(reference),
    onKorapayCancel: () => setCheckoutUrl(null),
  };

  return {
    requestListingFeePayment,
    modalProps,
    formatListingFee: (gateError: ProductTierGateError | null) => {
      if (!gateError?.listingFee) {
        return null;
      }

      return formatMembershipMoney(
        gateError.listingFee.amountLocal,
        gateError.listingFee.currency,
      );
    },
  };
}
