import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { deleteUserAccount } from '../../../services/api/usersApi';
import { useAuth } from '../../auth/hooks/useAuth';

export function useDeleteAccount(userId: string | undefined) {
  const { logout, user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmAndDelete = useCallback(() => {
    if (!userId || isDeleting) {
      return;
    }

    Alert.alert(
      'Delete account',
      'This permanently deletes your account and removes your cart. Orders and financial records may be retained as required by law. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsDeleting(true);
              setError(null);
              try {
                await deleteUserAccount(userId, user?.accessToken);
                await logout();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete account');
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [isDeleting, logout, userId]);

  return {
    confirmAndDelete,
    isDeleting,
    error,
    clearError: () => setError(null),
  };
}
