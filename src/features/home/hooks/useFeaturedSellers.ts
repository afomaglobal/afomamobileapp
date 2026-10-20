import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '../../../services/api/errors';
import { orderSellersByIds } from '../../../services/api/sellerOrder';
import { getSellersByIds } from '../../../services/api/sellersApi';
import {
  extractFeaturedSellersFromSettings,
  extractFeaturedShopIds,
  getAllSettingsTypes,
} from '../../../services/api/settingsApi';
import type { Seller } from '../../../services/types/seller';

const HOME_SELLER_LIMIT = 3;

export function useFeaturedSellers(limit = HOME_SELLER_LIMIT) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadFeaturedSellers = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const settings = await getAllSettingsTypes();
      const shopIds = extractFeaturedShopIds(settings.settings);
      if (shopIds.length === 0) {
        setSellers([]);
        return;
      }

      const embedded = [
        ...(Array.isArray(settings.sellers) ? settings.sellers : []),
        ...extractFeaturedSellersFromSettings(settings.settings),
      ];
      if (embedded.length > 0) {
        setSellers(orderSellersByIds(embedded, shopIds).slice(0, limit));
        return;
      }

      const response = await getSellersByIds({ ids: shopIds });
      const list = Array.isArray(response) ? response : [];
      setSellers(orderSellersByIds(list, shopIds).slice(0, limit));
    } catch (err) {
      if (!hasLoadedRef.current) {
        setSellers([]);
      }
      setError(getErrorMessage(err, 'Failed to load featured sellers'));
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadFeaturedSellers();
  }, [loadFeaturedSellers]);

  return {
    sellers,
    isLoading,
    error,
    retry: loadFeaturedSellers,
  };
}
