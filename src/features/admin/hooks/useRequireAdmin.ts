import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useAuth } from '../../auth/hooks/useAuth';
import { useAuthGateRedirect } from '../../auth/hooks/useAuthGateRedirect';
import type { AuthReturnTo } from '../../auth/utils/authNavigation';

export function useRequireAdmin(returnTo?: AuthReturnTo) {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const hasAccessToken = Boolean(user?.accessToken?.trim());

  const isAdmin = role === 'admin';
  const isAuthorized = isAuthenticated && isAdmin && hasAccessToken;

  useAuthGateRedirect({ needsLogin: !isAuthenticated, isLoading, returnTo });

  useFocusEffect(
    useCallback(() => {
      if (isLoading) {
        return;
      }

      if (!isAuthenticated) {
        return;
      }

      if (!isAdmin) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    }, [isAdmin, isAuthenticated, isLoading, navigation]),
  );

  return {
    isAuthorized,
    isAdmin,
    isLoading,
    role,
  };
}
