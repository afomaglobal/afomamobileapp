let refreshRequested = false;

export function requestMarketplaceHomeRefresh(): void {
  refreshRequested = true;
}

export function consumeMarketplaceHomeRefreshRequest(): boolean {
  const shouldRefresh = refreshRequested;
  refreshRequested = false;
  return shouldRefresh;
}
