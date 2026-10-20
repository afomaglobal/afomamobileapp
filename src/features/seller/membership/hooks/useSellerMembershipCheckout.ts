import { useCallback, useState } from 'react';

import { getErrorMessage } from '../../../../services/api/errors';
import {
  createMembershipCheckout,
  createMembershipPlanChangeCheckout,
  createMembershipRenewalCheckout,
  verifyMembershipCheckout,
} from '../api/sellerMembershipApi';
import type {
  MembershipCheckoutResponse,
  SellerBillingCycle,
  SellerMembershipTierId,
} from '../types/sellerMembership';

export function useSellerMembershipCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (params: {
      sellerId: string;
      membershipTier: SellerMembershipTierId;
      billingCycle: SellerBillingCycle;
      redirectUrl?: string;
      applyWalletCredits?: boolean;
      mode?: 'registration' | 'activation' | 'upgrade' | 'renewal';
    }): Promise<MembershipCheckoutResponse | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        if (params.mode === 'renewal') {
          return await createMembershipRenewalCheckout({
            sellerId: params.sellerId,
            redirectUrl: params.redirectUrl,
            applyWalletCredits: params.applyWalletCredits,
          });
        }
        if (params.mode === 'upgrade') {
          const { mode: _mode, ...checkoutParams } = params;
          return await createMembershipPlanChangeCheckout(checkoutParams);
        }
        const { mode: _mode, ...checkoutParams } = params;
        return await createMembershipCheckout(checkoutParams);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to start checkout'));
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const verifyCheckout = useCallback(async (reference: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      return await verifyMembershipCheckout(reference);
    } catch (err) {
      setError(getErrorMessage(err, 'Payment verification failed'));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    error,
    startCheckout,
    verifyCheckout,
    clearError: () => setError(null),
    setError,
  };
}
