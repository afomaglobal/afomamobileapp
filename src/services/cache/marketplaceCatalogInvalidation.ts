import { requestMarketplaceHomeRefresh } from '../../features/home/state/marketplaceHomeRefresh';

import { clearListingCache, invalidateProductCache, invalidateShopCache } from './screenCache';

/** Call after catalog-changing writes (products, featured shops, approvals). */
export function invalidateMarketplaceCatalog(options?: {
  productId?: string;
  productSlug?: string;
  shopSlug?: string;
  refreshHome?: boolean;
}): void {
  clearListingCache();

  if (options?.productId || options?.productSlug) {
    invalidateProductCache(options.productId, options.productSlug);
  }

  if (options?.shopSlug) {
    invalidateShopCache(options.shopSlug);
  }

  if (options?.refreshHome !== false) {
    requestMarketplaceHomeRefresh();
  }
}
