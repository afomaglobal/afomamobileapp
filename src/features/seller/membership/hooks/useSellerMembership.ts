import { useCallback, useEffect, useState } from 'react';

import { fetchSellerMembership } from '../api/sellerMembershipApi';
import type { SellerMembershipSummary } from '../types/sellerMembership';

export function useSellerMembership(sellerId?: string) {
  const [membership, setMembership] = useState<SellerMembershipSummary | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sellerId));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!sellerId) {
      setMembership(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchSellerMembership(sellerId);
      setMembership(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership');
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { membership, isLoading, error, reload };
}
