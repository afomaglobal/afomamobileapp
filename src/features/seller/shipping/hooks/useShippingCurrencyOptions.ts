import { useEffect, useState } from 'react';

import type { SelectOption } from '../../../../utils/regionOptions';
import {
  getCachedCurrencyCatalog,
  getCurrencyCatalogOptions,
  getInitialCurrencyCatalogOptions,
} from '../utils/currencyCatalog';

/** Full ISO currency catalog (web parity) for shipping, setup, and product forms. */
export function useShippingCurrencyOptions(currentCurrency?: string) {
  const [options, setOptions] = useState<SelectOption[]>(() =>
    getInitialCurrencyCatalogOptions(currentCurrency),
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedCurrencyCatalog());

  useEffect(() => {
    let cancelled = false;

    void getCurrencyCatalogOptions(currentCurrency)
      .then((nextOptions) => {
        if (!cancelled) {
          setOptions(nextOptions);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentCurrency]);

  return { options, isLoading };
}
