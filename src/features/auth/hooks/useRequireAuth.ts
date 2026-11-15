import { useAuth } from './useAuth';
import { useAuthGateRedirect } from './useAuthGateRedirect';
import type { AuthReturnTo } from '../utils/authNavigation';

export function useRequireAuth(returnTo: AuthReturnTo) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const hasAccessToken = Boolean(user?.accessToken?.trim());

  useAuthGateRedirect({ needsLogin: !isAuthenticated, isLoading, returnTo });

  return {
    isAuthenticated,
    isLoading,
    isAuthorized: !isLoading && isAuthenticated && hasAccessToken,
    hasAccessToken,
  };
}
