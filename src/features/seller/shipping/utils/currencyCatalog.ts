import type { SelectOption } from '../../../../utils/regionOptions';

import {
  fetchShippingCurrencyOptions,
  mergeShippingCurrencyOptions,
  SHIPPING_CURRENCY_OPTIONS,
} from './sellerShippingMappers';

let cachedCatalog: SelectOption[] | null = null;
let loadPromise: Promise<SelectOption[]> | null = null;

async function loadCurrencyCatalog(): Promise<SelectOption[]> {
  if (cachedCatalog && cachedCatalog.length > SHIPPING_CURRENCY_OPTIONS.length) {
    return cachedCatalog;
  }

  if (!loadPromise) {
    loadPromise = fetchShippingCurrencyOptions()
      .then((options) => {
        cachedCatalog = options.length > 0 ? options : [...SHIPPING_CURRENCY_OPTIONS];
        return cachedCatalog;
      })
      .catch(() => {
        cachedCatalog = [...SHIPPING_CURRENCY_OPTIONS];
        return cachedCatalog;
      })
      .finally(() => {
        loadPromise = null;
      });
  }

  return loadPromise;
}

export function getCachedCurrencyCatalog(): SelectOption[] | null {
  return cachedCatalog;
}

/** Warm the catalog early so pickers open with the full list. */
export function primeCurrencyCatalog(): void {
  void loadCurrencyCatalog();
}

export async function ensureCurrencyCatalogLoaded(): Promise<SelectOption[]> {
  return loadCurrencyCatalog();
}

export async function getCurrencyCatalogOptions(currentCurrency?: string): Promise<SelectOption[]> {
  const catalog = await loadCurrencyCatalog();
  return mergeShippingCurrencyOptions(catalog, currentCurrency);
}

export function getInitialCurrencyCatalogOptions(currentCurrency?: string): SelectOption[] {
  return mergeShippingCurrencyOptions(cachedCatalog ?? SHIPPING_CURRENCY_OPTIONS, currentCurrency);
}
