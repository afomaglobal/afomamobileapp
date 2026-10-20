import { useCallback, useEffect, useRef, useState } from 'react';

import { getSellerProfileCache, setSellerProfileCache } from '../../../../services/cache/screenCache';
import { mergeProfileSetupFromShippingConfig } from '../utils/sellerProfileShippingSetup';
import { mergeSellerProfileProgress } from '../../utils/mergeSellerProfileProgress';
import { getErrorMessage } from '../../../../services/api/errors';
import { getSellerProfile } from '../../../../services/api/sellersApi';
import type { SellerProfile } from '../../types/sellerProfile';
import { getSellerShippingConfig, saveSellerShippingConfig } from '../api/sellerShippingApi';
import type { SellerShippingConfig, SellerShippingFormState } from '../types/sellerShipping';
import {
  buildShippingSavePayload,
  emptySellerShippingFormState,
  fetchCurrencyToCadRate,
  resolveConversionRateCadForSave,
  shippingConfigToFormState,
  validateShippingForm,
} from '../utils/sellerShippingMappers';

interface UseSellerShippingConfigOptions {
  includeProfileSetup?: boolean;
}

export function useSellerShippingConfig(
  sellerId?: string,
  { includeProfileSetup = true }: UseSellerShippingConfigOptions = {},
) {
  const [config, setConfig] = useState<SellerShippingConfig | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState<SellerShippingFormState>(emptySellerShippingFormState());
  const [conversionRateCad, setConversionRateCad] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const applyCurrencyRate = useCallback(async (currency: string, existingRate?: number | string) => {
    const normalized = currency.trim().toLowerCase();
    if (!normalized || normalized === 'cad') {
      setConversionRateCad(1);
      return 1;
    }

    const parsedExisting = Number(existingRate);
    if (Number.isFinite(parsedExisting) && parsedExisting > 0) {
      setConversionRateCad(parsedExisting);
      return parsedExisting;
    }

    try {
      const rate = await fetchCurrencyToCadRate(currency);
      setConversionRateCad(rate);
      return rate;
    } catch {
      setConversionRateCad(Number(existingRate) || 1);
      return Number(existingRate) || 1;
    }
  }, []);

  const load = useCallback(async () => {
    if (!sellerId) {
      setConfig(null);
      setProfile(null);
      setForm(emptySellerShippingFormState());
      setError(null);
      setIsLoading(false);
      setHasLoaded(false);
      return;
    }

    setIsLoading(true);
    setHasLoaded(false);
    setError(null);

    try {
      const [shippingConfig, sellerProfile] = await Promise.all([
        getSellerShippingConfig(sellerId),
        getSellerProfile(sellerId),
      ]);

      setConfig(shippingConfig);
      setProfile(sellerProfile);
      setForm(shippingConfigToFormState(shippingConfig));
      await applyCurrencyRate(
        shippingConfig.currency ?? 'cad',
        shippingConfig.conversion_rate,
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load shipping configuration'));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [applyCurrencyRate, sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateForm = useCallback((updater: (current: SellerShippingFormState) => SellerShippingFormState) => {
    setForm((current) => updater(current));
    setSaveSuccessMessage(null);
    setSaveError(null);
  }, []);

  const changeCurrency = useCallback(
    async (currency: string) => {
      updateForm((current) => ({ ...current, currency }));
      await applyCurrencyRate(currency);
    },
    [applyCurrencyRate, updateForm],
  );

  const save = useCallback(async (): Promise<SellerProfile | null> => {
    if (!sellerId) {
      setSaveError('Seller ID unavailable.');
      return null;
    }

    const currentForm = formRef.current;
    const validation = validateShippingForm(currentForm, profile?.countryCode);
    if (!validation.valid) {
      setSaveError(validation.message ?? 'Fix the shipping configuration before saving.');
      return null;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMessage(null);

    try {
      const rate = await resolveConversionRateCadForSave(
        currentForm.currency,
        config?.conversion_rate ?? conversionRateCad,
      );
      setConversionRateCad(rate);

      const payload = buildShippingSavePayload({
        form: currentForm,
        sellerId,
        existingConfig: config,
        conversionRateCad: rate,
        includeProfileSetup,
      });

      const saved = await saveSellerShippingConfig(payload);
      const sellerProfile = await getSellerProfile(sellerId);
      const cachedProfile = getSellerProfileCache(sellerId);
      const refreshedProfile = mergeProfileSetupFromShippingConfig(
        mergeSellerProfileProgress(cachedProfile ?? profile, {
          ...sellerProfile,
          shippingConfigId: saved,
        }),
      );

      setConfig(saved);
      setProfile(refreshedProfile);
      setSellerProfileCache(sellerId, refreshedProfile);
      setForm(shippingConfigToFormState(saved));

      const savedRate = Number(saved.conversion_rate);
      if (Number.isFinite(savedRate) && savedRate > 0) {
        setConversionRateCad(savedRate);
      }

      setSaveSuccessMessage('Shipping configuration saved.');
      return refreshedProfile;
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save shipping configuration'));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [applyCurrencyRate, config, conversionRateCad, includeProfileSetup, profile?.countryCode, sellerId]);

  return {
    config,
    profile,
    form,
    conversionRateCad,
    isLoading,
    hasLoaded,
    isSaving,
    error,
    saveError,
    saveSuccessMessage,
    updateForm,
    changeCurrency,
    save,
    reload: load,
    setSaveError,
    setSaveSuccessMessage,
  };
}
