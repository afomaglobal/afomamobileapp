import { useCallback, useEffect, useState } from 'react';

import { getErrorMessage } from '../../../services/api/errors';
import { fetchServiceVerticals, fetchServiceVerticalBySlug } from '../api/servicesApi';
import type { ServiceSubcategory, ServiceVertical } from '../types/service';
import { DEFAULT_SERVICE_VERTICAL_SLUG } from '../utils/serviceBookingConstants';

export function useServiceVerticalPicker(initialVerticalSlug = DEFAULT_SERVICE_VERTICAL_SLUG) {
  const [verticals, setVerticals] = useState<ServiceVertical[]>([]);
  const [verticalSlug, setVerticalSlug] = useState(initialVerticalSlug);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadVerticals = useCallback(async () => {
    try {
      const list = await fetchServiceVerticals();
      setVerticals(list);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load service categories'));
    }
  }, []);

  const loadSubcategories = useCallback(async (slug: string) => {
    try {
      const detail = await fetchServiceVerticalBySlug(slug);
      setSubcategories(detail.subcategories ?? []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load subcategories'));
      setSubcategories([]);
    }
  }, []);

  useEffect(() => {
    void loadVerticals();
  }, [loadVerticals]);

  useEffect(() => {
    if (verticalSlug) {
      void loadSubcategories(verticalSlug);
    }
  }, [loadSubcategories, verticalSlug]);

  return {
    verticals,
    verticalSlug,
    setVerticalSlug,
    subcategories,
    error,
    reload: loadVerticals,
  };
}
