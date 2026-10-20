import { useStripe } from '@stripe/stripe-react-native';
import type { ReactNode } from 'react';

import { StripeCheckoutContextProvider, type StripeCheckoutActions } from './StripeCheckoutContext';

export function StripeCheckoutBridge({ children }: { children: ReactNode }) {
  const stripe = useStripe();

  return (
    <StripeCheckoutContextProvider
      value={{
        initPaymentSheet: stripe.initPaymentSheet,
        presentPaymentSheet: stripe.presentPaymentSheet,
        confirmPlatformPayPayment: (clientSecret, params) =>
          stripe.confirmPlatformPayPayment(clientSecret, params ?? {}),
        isPlatformPaySupported: stripe.isPlatformPaySupported,
        retrievePaymentIntent: stripe.retrievePaymentIntent,
      } as StripeCheckoutActions}
    >
      {children}
    </StripeCheckoutContextProvider>
  );
}
