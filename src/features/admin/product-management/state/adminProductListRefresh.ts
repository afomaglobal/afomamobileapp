import { clearListingCache, invalidateProductCache } from '../../../../services/cache/screenCache';
import { requestMarketplaceHomeRefresh } from '../../../home/state/marketplaceHomeRefresh';

let refreshRequested = false;
let resetToFirstPage = false;

export function requestAdminProductListRefresh(options?: {
  resetToFirstPage?: boolean;
  productId?: string;
}): void {
  refreshRequested = true;
  resetToFirstPage = Boolean(options?.resetToFirstPage);
  clearListingCache();
  if (options?.productId) {
    invalidateProductCache(options.productId);
  }
  requestMarketplaceHomeRefresh();
}

export function consumeAdminProductListRefreshRequest(): {
  refresh: boolean;
  resetToFirstPage: boolean;
} {
  const result = {
    refresh: refreshRequested,
    resetToFirstPage,
  };

  refreshRequested = false;
  resetToFirstPage = false;
  return result;
}
