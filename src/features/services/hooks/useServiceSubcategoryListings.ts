import { useCallback, useEffect, useMemo, useState } from 'react';



import { usePricing } from '../../../app/providers/PricingProvider';

import { getErrorMessage } from '../../../services/api/errors';

import type { Product } from '../../../services/types/product';

import {

  applyProductPricing,

  filterApprovedProducts,

} from '../../products/utils/productDisplay';

import { fetchServicesByCategoryId } from '../api/servicesApi';



export function useServiceSubcategoryListings(

  categoryId: string | undefined,

  options: { enabled?: boolean } = {},

) {

  const enabled = options.enabled ?? true;

  const { userInfo } = usePricing();

  const [rawServices, setRawServices] = useState<Product[]>([]);

  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(Boolean(categoryId && enabled));



  const services = useMemo(

    () => applyProductPricing(filterApprovedProducts(rawServices), userInfo),

    [rawServices, userInfo],

  );



  const loadInitial = useCallback(async () => {

    if (!enabled || !categoryId) {

      setIsRefreshing(false);

      return;

    }

    setIsRefreshing(true);

    setError(null);

    try {

      const listings = await fetchServicesByCategoryId(categoryId, { page: 1, limit: 20 });

      setRawServices(listings.services ?? []);

      setPage(1);

      setHasMore(listings.pagination?.hasMore ?? false);

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to load services'));

    } finally {

      setIsRefreshing(false);

    }

  }, [categoryId, enabled]);



  useEffect(() => {

    void loadInitial();

  }, [loadInitial]);



  const loadMore = useCallback(async () => {

    if (!categoryId || !hasMore || isLoadingMore) {

      return;

    }

    setIsLoadingMore(true);

    try {

      const nextPage = page + 1;

      const listings = await fetchServicesByCategoryId(categoryId, { page: nextPage, limit: 20 });

      setRawServices((prev) => [...prev, ...(listings.services ?? [])]);

      setPage(nextPage);

      setHasMore(listings.pagination?.hasMore ?? false);

    } catch (err) {

      setError(getErrorMessage(err, 'Failed to load more'));

    } finally {

      setIsLoadingMore(false);

    }

  }, [categoryId, hasMore, isLoadingMore, page]);



  return {

    services,

    hasMore,

    isLoadingMore,

    isRefreshing,

    error,

    retry: loadInitial,

    loadMore,

  };

}

