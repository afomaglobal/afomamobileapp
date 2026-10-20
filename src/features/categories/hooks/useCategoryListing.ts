import { useMemo } from 'react';

import type { Product } from '../../../services/types/product';
import { useServiceSubcategoryListings } from '../../services/hooks/useServiceSubcategoryListings';
import {
  usePaginatedCategoryProducts,
  type CategoryProductFilters,
} from './usePaginatedCategoryProducts';

export type CategoryListingKind = 'products' | 'services';

function getServiceListingCategoryId(filters: CategoryProductFilters): string | undefined {
  return filters.subCategoryId ?? filters.childCategoryId ?? filters.categoryId;
}

export function useCategoryListing(
  filters: CategoryProductFilters,
  listingKind: CategoryListingKind = 'products',
) {
  const productsState = usePaginatedCategoryProducts(filters, {
    enabled: listingKind === 'products',
  });
  const serviceCategoryId =
    listingKind === 'services' ? getServiceListingCategoryId(filters) : undefined;
  const servicesState = useServiceSubcategoryListings(serviceCategoryId, {
    enabled: listingKind === 'services',
  });

  return useMemo(() => {
    if (listingKind === 'services') {
      return {
        products: servicesState.services as Product[],
        isRefreshing: servicesState.isRefreshing,
        isLoading: servicesState.isRefreshing && servicesState.services.length === 0,
        isLoadingMore: servicesState.isLoadingMore,
        hasMore: servicesState.hasMore,
        error: servicesState.error,
        retry: servicesState.retry,
        loadMore: servicesState.loadMore,
      };
    }

    return {
      products: productsState.products,
      isRefreshing: productsState.isRefreshing,
      isLoading: productsState.isLoading,
      isLoadingMore: productsState.isLoadingMore,
      hasMore: productsState.hasMore,
      error: productsState.error,
      retry: productsState.retry,
      loadMore: productsState.loadMore,
    };
  }, [listingKind, productsState, servicesState]);
}
