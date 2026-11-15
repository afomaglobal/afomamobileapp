import { useAuth } from '../../auth/hooks/useAuth';
import { useAuthGateRedirect } from '../../auth/hooks/useAuthGateRedirect';
import { resolveAuthSellerId } from '../../auth/utils/resolveAuthSellerId';
import type { AuthReturnTo } from '../../auth/utils/authNavigation';

export function useRequireSeller(returnTo?: AuthReturnTo) {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const sellerId = resolveAuthSellerId(user);

  const isSeller = role === 'seller' && Boolean(sellerId);
  const isAuthorized = isAuthenticated && isSeller;

  useAuthGateRedirect({ needsLogin: !isAuthenticated, isLoading, returnTo });

  return {
    isAuthorized,
    isSeller,
    sellerId,
    isLoading,
    role,
  };
}
