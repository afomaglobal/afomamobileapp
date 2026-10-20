import { useCallback, useEffect, useState } from 'react';

import { fetchMembershipPlans } from '../api/sellerMembershipApi';
import type { MembershipPlansResponse } from '../types/sellerMembership';

export function useMembershipPlans(country?: string) {
  const [data, setData] = useState<MembershipPlansResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchMembershipPlans(country);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, reload: load };
}
