import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePricing } from '../../../app/providers/PricingProvider';
import { getErrorMessage } from '../../../services/api/errors';
import type { Product } from '../../../services/types/product';
import {
  applyProductPricing,
  filterApprovedProducts,
} from '../../products/utils/productDisplay';
import {
  fetchServiceVerticalBySlug,
  fetchServicesByCategoryId,
} from '../api/servicesApi';
import { DEFAULT_SERVICE_VERTICAL_SLUG } from '../utils/serviceBookingConstants';
import type { ServiceSubcategory, ServiceVertical } from '../types/service';

export function useServiceHub(verticalSlug = DEFAULT_SERVICE_VERTICAL_SLUG) {
  const [vertical, setVertical] = useState<ServiceVertical | null>(null);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [rawServices, setRawServices] = useState<Product[]>([]);
  const { userInfo } = usePricing();
  const services = useMemo(
    () => applyProductPricing(filterApprovedProducts(rawServices), userInfo),
    [rawServices, userInfo],
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const verticalCategoryId = vertical?._id;

  const loadInitial = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const detail = await fetchServiceVerticalBySlug(verticalSlug);
      const nextVertical = detail.vertical ?? null;
      setVertical(nextVertical);
      setSubcategories(detail.subcategories ?? []);

      if (nextVertical?._id) {
        const listings = await fetchServicesByCategoryId(nextVertical._id, { page: 1, limit: 20 });
        setRawServices(listings.services ?? []);
        setPage(1);
        setHasMore(listings.pagination?.hasMore ?? false);
      } else {
        setRawServices([]);
        setHasMore(false);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load services'));
    } finally {
      setIsRefreshing(false);
    }
  }, [verticalSlug]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!verticalCategoryId || !hasMore || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const listings = await fetchServicesByCategoryId(verticalCategoryId, {
        page: nextPage,
        limit: 20,
      });
      setRawServices((prev) => [...prev, ...(listings.services ?? [])]);
      setPage(nextPage);
      setHasMore(listings.pagination?.hasMore ?? false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load more services'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, page, verticalCategoryId]);

  return {
    vertical,
    subcategories,
    services,
    hasMore,
    isLoadingMore,
    isRefreshing,
    error,
    retry: loadInitial,
    loadMore,
    verticalCategoryId,
  };
}
