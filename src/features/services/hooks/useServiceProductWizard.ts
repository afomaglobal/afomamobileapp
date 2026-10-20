import { useCallback, useEffect, useMemo, useState } from 'react';

import { getErrorMessage } from '../../../services/api/errors';
import { useListingFeePayment } from '../../seller/membership/hooks/useListingFeePayment';
import {
  canSubmitProductForReview,
  getSellerProductById,
  submitProductForReview,
  updateProduct,
  type SellerProductCreatePayload,
} from '../../seller/products/api/sellerProductsApi';
import type { WeeklyHourRow } from '../components/WeeklyHoursEditor';
import { createProductWithTierGate } from '../../seller/products/utils/createProductWithTierGate';
import {
  getProductTierUserMessage,
  parseProductTierError,
} from '../../seller/products/utils/productTierErrors';
import { useShippingCurrencyOptions } from '../../seller/shipping/hooks/useShippingCurrencyOptions';
import { convertToCadPrice, fetchCurrencyRateToCad } from '../../seller/products/services/currencyRateService';
import { invalidateMarketplaceCatalog } from '../../../services/cache/marketplaceCatalogInvalidation';
import { useProductImages } from '../../seller/products/hooks/useProductImages';
import { mapImagesFromProduct } from '../../seller/products/utils/productFormMappers';
import { fetchSellerStaffManage } from '../api/serviceBookingApi';
import type { ServiceStaffMember } from '../types/service';
import {
  createEmptyServiceProductForm,
  type ServiceProductFormValues,
} from '../types/serviceProductForm';
import { buildServiceProductPayload } from '../utils/serviceProductPayload';
import { createDefaultWeeklyHours } from '../utils/serviceBookingConstants';
import { normalizeServiceAddOnsFromApi } from '../utils/serviceAddOns';
import type { Product } from '../../../services/types/product';
import type { AdminProductAiPrefill } from '../../admin/product-management/types/adminProductAiPrefill';
import {
  SERVICE_WIZARD_STEPS,
  type ServiceWizardStepId,
} from '../utils/serviceProductConstants';
import {
  validateServiceProductForm,
  validateServiceProductStep,
} from '../utils/serviceProductValidation';

function mapProductToServiceForm(product: Product): ServiceProductFormValues {
  const sd = product.serviceDetails;
  return {
    productName: product.productName ?? '',
    description: product.description ?? '',
    categoryId: product.Category?._id ?? (product.Category as string | undefined) ?? '',
    subCategoryId: product.SubCategory?._id ?? (product.SubCategory as string | undefined) ?? '',
    price: String(product.price ?? product.finalPrice ?? ''),
    currency: (product.currency ?? 'cad').toLowerCase(),
    currencyPrice: String(product.currencyPrice ?? product.price ?? ''),
    durationMinutes: String(sd?.durationMinutes ?? 60),
    priceType: sd?.priceType ?? 'fixed',
    serviceLocation: sd?.serviceLocation ?? 'at_salon',
    acceptOnlinePayment: Boolean(sd?.acceptOnlinePayment),
    scheduleMode: sd?.scheduleMode === 'custom' ? 'custom' : 'inherit',
    customWeeklyHours: sd?.customWeeklyHours?.length
      ? (sd.customWeeklyHours as WeeklyHourRow[])
      : createDefaultWeeklyHours(),
    staffIds: (sd?.staffIds ?? []).map(String),
    serviceAddOns: normalizeServiceAddOnsFromApi(sd?.addOns),
    metaTitle: product.metaTitle ?? '',
    metaKeywords: product.metaKeywords ?? '',
    metaDesc: product.metaDesc ?? '',
  };
}

export function useServiceProductWizard(
  sellerId: string | undefined,
  productId: string | undefined,
  accessToken: string | undefined,
  options?: { requireSellerSelection?: boolean },
) {
  const requireSellerSelection = options?.requireSellerSelection ?? false;
  const [values, setValues] = useState<ServiceProductFormValues>(createEmptyServiceProductForm);
  const {
    images,
    uploadedImageCount,
    imageError,
    setImagesFromEntries,
    uploadPendingImages,
    addImageFromPicker,
    removeImage,
    updateImageAltText,
    imageUploadSheetProps,
  } = useProductImages();
  const [staffOptions, setStaffOptions] = useState<ServiceStaffMember[]>([]);
  const [savedProductId, setSavedProductId] = useState<string | null>(productId ?? null);
  const [productStatus, setProductStatus] = useState<string | undefined>();
  const [isLoadingProduct, setIsLoadingProduct] = useState(Boolean(productId));
  const [loadProductError, setLoadProductError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [currencyRate, setCurrencyRate] = useState(1);
  const { options: currencyOptions, isLoading: isLoadingCurrencies } = useShippingCurrencyOptions(
    values.currency,
  );
  const [resolvedSellerId, setResolvedSellerId] = useState<string | undefined>(sellerId);
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentStep = SERVICE_WIZARD_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === SERVICE_WIZARD_STEPS.length - 1;

  useEffect(() => {
    if (sellerId) {
      setResolvedSellerId(sellerId);
    }
  }, [sellerId]);

  const effectiveSellerId = resolvedSellerId ?? sellerId;
  const listingFeePayment = useListingFeePayment(effectiveSellerId);

  const isEditMode = Boolean(productId);
  const canSubmit = canSubmitProductForReview(productStatus);

  const patchValues = useCallback((patch: Partial<ServiceProductFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyAiPrefill = useCallback(
    (prefill: AdminProductAiPrefill) => {
      if (prefill.serviceValues) {
        setValues((prev) => ({ ...prev, ...prefill.serviceValues }));
      }
      if (prefill.images.length > 0) {
        setImagesFromEntries(prefill.images);
      }
      setSaveSuccessMessage('AI draft applied. Review and save.');
    },
    [setImagesFromEntries],
  );

  const patchCurrencyPrice = useCallback(
    (currencyPrice: string) => {
      if (values.currency === 'cad') {
        patchValues({ currencyPrice, price: currencyPrice });
        return;
      }
      const amount = parseFloat(currencyPrice);
      const price =
        Number.isFinite(amount) && currencyRate > 0
          ? (amount * currencyRate).toFixed(2)
          : values.price;
      patchValues({ currencyPrice, price });
    },
    [currencyRate, patchValues, values.currency, values.price],
  );

  useEffect(() => {
    const currency = values.currency || 'cad';
    void fetchCurrencyRateToCad(currency)
      .then((rate) => setCurrencyRate(rate ?? 1))
      .catch(() => setCurrencyRate(1));
  }, [values.currency]);

  useEffect(() => {
    if (!effectiveSellerId || !accessToken) {
      return;
    }
    void fetchSellerStaffManage(effectiveSellerId, accessToken)
      .then((res) => setStaffOptions(res.staff ?? []))
      .catch(() => setStaffOptions([]));
  }, [accessToken, effectiveSellerId]);

  useEffect(() => {
    if (!productId) {
      setValues(createEmptyServiceProductForm());
      return;
    }
    let cancelled = false;
    setIsLoadingProduct(true);
    void getSellerProductById(productId)
      .then((product) => {
        if (cancelled) {
          return;
        }
        setValues(mapProductToServiceForm(product));
        setImagesFromEntries(mapImagesFromProduct(product));
        setProductStatus(product.productStatus);
        setSavedProductId(product._id ?? productId);
        const productSellerId =
          product.seller?._id ??
          (typeof product.seller === 'string' ? product.seller : undefined);
        if (productSellerId) {
          setResolvedSellerId(String(productSellerId));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadProductError(getErrorMessage(err, 'Failed to load service'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProduct(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId, setImagesFromEntries]);

  const sellerValidationOptions = useMemo(
    () => ({
      requireSeller: requireSellerSelection,
      hasSeller: Boolean(effectiveSellerId?.trim()),
    }),
    [effectiveSellerId, requireSellerSelection],
  );

  const validateCurrentStep = useCallback(() => {
    const errors = validateServiceProductStep(
      currentStep.id,
      values,
      images,
      sellerValidationOptions,
    );
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentStep.id, images, sellerValidationOptions, values]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) {
      return false;
    }
    setStepIndex((index) => Math.min(index + 1, SERVICE_WIZARD_STEPS.length - 1));
    return true;
  }, [validateCurrentStep]);

  const goBack = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const goToStep = useCallback((stepId: ServiceWizardStepId) => {
    const index = SERVICE_WIZARD_STEPS.findIndex((step) => step.id === stepId);
    if (index >= 0) {
      setStepIndex(index);
    }
  }, []);

  const validate = useCallback((): string | null => {
    const errors = validateServiceProductForm(values, images, sellerValidationOptions);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return 'Please fix the highlighted fields before saving.';
    }
    return null;
  }, [images, sellerValidationOptions, values]);

  const save = useCallback(async (): Promise<string | null> => {
    if (!effectiveSellerId) {
      setSaveError('Seller is required to save this service.');
      return null;
    }
    const validationError = validate();
    if (validationError) {
      setSaveError(validationError);
      return null;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMessage(null);
    try {
      const uploadedImages = await uploadPendingImages(images);
      const cadPrice = convertToCadPrice(values.price, currencyRate);
      const formWithCad = { ...values, price: String(cadPrice) };
      const payload = buildServiceProductPayload(
        formWithCad,
        uploadedImages,
        effectiveSellerId,
        currencyRate,
        isEditMode && productStatus === 'Approved' ? productStatus : 'Draft',
      ) as unknown as SellerProductCreatePayload;
      let product: Product;
      if (savedProductId) {
        product = await updateProduct(savedProductId, payload);
      } else {
        product = await createProductWithTierGate(payload, listingFeePayment.requestListingFeePayment);
      }
      const id = product._id ?? savedProductId;
      if (id) {
        setSavedProductId(id);
      }
      setProductStatus(product.productStatus);
      setSaveSuccessMessage(isEditMode ? 'Service updated.' : 'Service saved as draft.');
      if (id) {
        invalidateMarketplaceCatalog({ productId: id, productSlug: product.slug });
      }
      return id ?? null;
    } catch (err) {
      const tier = parseProductTierError(err);
      setSaveError(tier ? getProductTierUserMessage(tier) : getErrorMessage(err, 'Failed to save service'));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    currencyRate,
    images,
    isEditMode,
    listingFeePayment.requestListingFeePayment,
    productStatus,
    savedProductId,
    effectiveSellerId,
    uploadPendingImages,
    validate,
    values,
  ]);

  const submitForReview = useCallback(async () => {
    const id = savedProductId ?? (await save());
    if (!id) {
      return false;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitProductForReview(id);
      setProductStatus('Pending');
      setSaveSuccessMessage('Service submitted for review.');
      invalidateMarketplaceCatalog({ productId: id });
      return true;
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to submit service'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [save, savedProductId]);

  return {
    effectiveSellerId,
    stepIndex,
    currentStep,
    isFirstStep,
    isLastStep,
    fieldErrors,
    setFieldErrors,
    goNext,
    goBack,
    goToStep,
    validateCurrentStep,
    values,
    patchValues,
    patchCurrencyPrice,
    applyAiPrefill,
    images,
    uploadedImageCount,
    imageError,
    addImageFromPicker,
    removeImage,
    updateImageAltText,
    imageUploadSheetProps,
    staffOptions,
    currencyOptions,
    currencyRate,
    isLoadingCurrencies,
    isLoadingProduct,
    loadProductError,
    isSaving,
    isSubmitting,
    saveError,
    submitError,
    saveSuccessMessage,
    canSubmit,
    productStatus,
    savedProductId,
    save,
    submitForReview,
    listingFeePayment,
  };
}
