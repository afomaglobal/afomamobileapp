import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePricing } from '../../../app/providers/PricingProvider';
import { getErrorMessage } from '../../../services/api/errors';
import { getHomeDealsSlot, type HomeDealsSlotType } from '../../../services/api/productsApi';
import type { Product } from '../../../services/types/product';
import { applyProductPricing } from '../../products/utils/productDisplay';

/**
 * The home "deals" spot. The server decides what goes there (Most Discounted, featured sellers,
 * gift picks) and in which order; type "none" / no products → the section is hidden.
 */
export function useHomeDealsSlot(previewLimit = 4) {
  const { userInfo } = usePricing();
  const [type, setType] = useState<HomeDealsSlotType>('none');
  const [title, setTitle] = useState('');
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const products = useMemo(
    () => applyProductPricing(rawProducts, userInfo).slice(0, previewLimit),
    [previewLimit, rawProducts, userInfo],
  );

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) setIsLoading(true);
    setError(null);
    try {
      const slot = await getHomeDealsSlot();
      setType(slot.type);
      setTitle(slot.title);
      setRawProducts(slot.products);
    } catch (err) {
      if (!hasLoadedRef.current) {
        setRawProducts([]);
        setType('none');
      }
      setError(getErrorMessage(err, 'Failed to load deals'));
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { type, title, products, isLoading, error, retry: load };
}
