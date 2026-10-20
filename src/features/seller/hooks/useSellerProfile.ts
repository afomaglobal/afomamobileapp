import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getSellerProfileCache,
  setSellerProfileCache,
  subscribeSellerProfileCache,
} from '../../../services/cache/screenCache';
import { getErrorMessage } from '../../../services/api/errors';
import { getSellerProfile } from '../../../services/api/sellersApi';
import { enrichSellerProfileWithShippingSetup, mergeProfileSetupFromShippingConfig } from '../shipping/utils/sellerProfileShippingSetup';
import type { SellerProfile } from '../types/sellerProfile';
import { mergeSellerProfileProgress } from '../utils/mergeSellerProfileProgress';

async function normalizeSellerProfile(sellerId: string, profile: SellerProfile): Promise<SellerProfile> {
  return enrichSellerProfileWithShippingSetup(sellerId, profile);
}

export function useSellerProfile(sellerId?: string) {
  const [profile, setProfile] = useState<SellerProfile | null>(() =>
    sellerId ? getSellerProfileCache(sellerId) ?? null : null,
  );
  const [isRefreshing, setIsRefreshing] = useState(Boolean(sellerId));
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef(profile);

  profileRef.current = profile;

  const reload = useCallback(async () => {
    if (!sellerId) {
      setProfile(null);
      setError(null);
      setIsRefreshing(false);
      return;
    }

    const hasExistingProfile = Boolean(profileRef.current);
    if (!hasExistingProfile) {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const fetched = await getSellerProfile(sellerId);
      const cached = getSellerProfileCache(sellerId);
      const merged = mergeSellerProfileProgress(cached, fetched);
      const response = await normalizeSellerProfile(sellerId, merged);
      setProfile(response);
      setSellerProfileCache(sellerId, response);
    } catch (err) {
      if (!hasExistingProfile) {
        setProfile(null);
        setError(getErrorMessage(err, 'Failed to load seller profile'));
      } else {
        setError(getErrorMessage(err, 'Unable to refresh seller profile.'));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) {
      setProfile(null);
      return;
    }

    const cachedProfile = getSellerProfileCache(sellerId);
    if (cachedProfile) {
      setProfile(cachedProfile);
    }
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) {
      return;
    }

    return subscribeSellerProfileCache((id, nextProfile) => {
      if (id === sellerId) {
        setProfile(nextProfile);
      }
    });
  }, [sellerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyProfileUpdate = useCallback(
    (nextProfile: SellerProfile) => {
      const previous = sellerId ? profileRef.current ?? getSellerProfileCache(sellerId) : profileRef.current;
      const merged = mergeSellerProfileProgress(previous, nextProfile);
      const withShippingFlags = mergeProfileSetupFromShippingConfig(merged);

      setProfile(withShippingFlags);

      if (!sellerId) {
        return;
      }

      setSellerProfileCache(sellerId, withShippingFlags);

      void normalizeSellerProfile(sellerId, withShippingFlags).then((normalized) => {
        const reconciled = mergeSellerProfileProgress(withShippingFlags, normalized);
        setProfile(reconciled);
        setSellerProfileCache(sellerId, reconciled);
      });
    },
    [sellerId],
  );

  return {
    profile,
    isRefreshing,
    isLoading: isRefreshing && !profile,
    error,
    reload,
    applyProfileUpdate,
  };
}
