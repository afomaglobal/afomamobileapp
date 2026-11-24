import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePricing } from '../../../app/providers/PricingProvider';
import { getErrorMessage } from '../../../services/api/errors';
import { getBestProducts, getHomeCollections } from '../../../services/api/productsApi';
import type { Product } from '../../../services/types/product';
import { applyProductPricing } from '../../products/utils/productDisplay';
import { normalizeBestSellerProducts } from '../utils/homeProducts';

/** Same caps as the website home (lib/homeLayoutConfig.js). */
export const HOME_TRENDING_MAX = 12;
export const HOME_TEAM_PICKS_MAX = 8;

/**
 * Home "Trending Now" + "AFOMA Team Picks" from the admin's lists (GET /products/home-collections).
 * If the admin hasn't picked any trending products, Trending falls back to the best sellers so
 * the row isn't missing. Team Picks has no fallback: empty → the section is hidden.
 */
export function useHomeCollections() {
  const { userInfo } = usePricing();
  const [rawTrending, setRawTrending] = useState<Product[]>([]);
  const [rawTeamPicks, setRawTeamPicks] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const trending = useMemo(
    () => applyProductPricing(rawTrending, userInfo),
    [rawTrending, userInfo],
  );
  const teamPicks = useMemo(
    () => applyProductPricing(rawTeamPicks, userInfo),
    [rawTeamPicks, userInfo],
  );

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const collections = await getHomeCollections();
      let nextTrending = collections.trending;
      if (nextTrending.length === 0) {
        try {
          nextTrending = normalizeBestSellerProducts(await getBestProducts());
        } catch {
          nextTrending = [];
        }
      }
      setRawTrending(nextTrending.slice(0, HOME_TRENDING_MAX));
      setRawTeamPicks(collections.teamPicks.slice(0, HOME_TEAM_PICKS_MAX));
    } catch (err) {
      if (!hasLoadedRef.current) {
        setRawTrending([]);
        setRawTeamPicks([]);
      }
      setError(getErrorMessage(err, 'Failed to load home products'));
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { trending, teamPicks, isLoading, error, retry: load };
}
