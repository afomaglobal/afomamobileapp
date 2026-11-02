import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { deleteMySellerAccount } from '../../../services/api/sellersApi';
import { deleteUserAccount } from '../../../services/api/usersApi';
import { getErrorMessage } from '../../../services/api/errors';
import { useAuth } from '../../auth/hooks/useAuth';

const SELLER_DELETE_MESSAGE =
  'Your seller profile, listings, and login will be permanently deleted. Orders and financial records may be retained as required by law. This cannot be undone.';

const CUSTOMER_DELETE_MESSAGE =
  'This permanently deletes your account and removes your cart. Orders and financial records may be retained as required by law. This cannot be undone.';

async function purgeSellerAccountAndLogout(logout: () => Promise<void>): Promise<void> {
  await deleteMySellerAccount();
  await logout();
}

/** Web parity: DELETE /sellers/me/account for sellers outside Nigeria launch self-service. */
export function useDeleteSellerAccount() {
  const { logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmAndDelete = useCallback(() => {
    if (isDeleting) {
      return;
    }

    Alert.alert('Delete seller account?', SELLER_DELETE_MESSAGE, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete permanently',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsDeleting(true);
            setError(null);
            try {
              await purgeSellerAccountAndLogout(logout);
            } catch (err) {
              setError(getErrorMessage(err, 'Failed to delete seller account'));
            } finally {
              setIsDeleting(false);
            }
          })();
        },
      },
    ]);
  }, [isDeleting, logout]);

  return {
    confirmAndDelete,
    isDeleting,
    error,
    clearError: () => setError(null),
  };
}

export function useDeleteAccount(userId: string | undefined) {
  const { logout, user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSeller = user?.userRole === 'seller';

  const confirmAndDelete = useCallback(() => {
    if (isDeleting) {
      return;
    }

    if (!isSeller && !userId) {
      return;
    }

    Alert.alert(
      isSeller ? 'Delete seller account?' : 'Delete account',
      isSeller ? SELLER_DELETE_MESSAGE : CUSTOMER_DELETE_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSeller ? 'Delete permanently' : 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsDeleting(true);
              setError(null);
              try {
                if (isSeller) {
                  await purgeSellerAccountAndLogout(logout);
                } else {
                  await deleteUserAccount(userId!, user?.accessToken);
                  await logout();
                }
              } catch (err) {
                setError(getErrorMessage(err, 'Failed to delete account'));
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [isDeleting, isSeller, logout, user?.accessToken, userId]);

  return {
    confirmAndDelete,
    isDeleting,
    error,
    clearError: () => setError(null),
    isSellerAccount: isSeller,
  };
}
