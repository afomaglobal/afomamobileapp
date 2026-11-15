import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { loadGuestCheckoutProfile } from '../../../services/storage/guestSessionStorage';
import { useAuth } from '../../auth/hooks/useAuth';
import { useAuthGateRedirect } from '../../auth/hooks/useAuthGateRedirect';
import type { AuthReturnTo } from '../../auth/utils/authNavigation';

export function useRequireCheckoutAccess(returnTo: AuthReturnTo) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [guestReady, setGuestReady] = useState(false);
  const [guestLoading, setGuestLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        setGuestReady(false);
        setGuestLoading(false);
        return;
      }

      let active = true;
      setGuestLoading(true);

      void loadGuestCheckoutProfile().then((profile) => {
        if (!active) {
          return;
        }

        setGuestReady(Boolean(profile?.email?.trim()));
        setGuestLoading(false);
      });

      return () => {
        active = false;
      };
    }, [isAuthenticated]),
  );

  const hasAccess = isAuthenticated || guestReady;
  const isLoading = authLoading || guestLoading;

  useAuthGateRedirect({ needsLogin: !hasAccess, isLoading, returnTo });

  return {
    isAuthenticated,
    isGuestCheckout: !isAuthenticated && guestReady,
    isLoading,
    isAuthorized: !isLoading && hasAccess,
  };
}
