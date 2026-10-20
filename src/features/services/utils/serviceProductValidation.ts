import type { StandardProductImageEntry } from '../../seller/products/types/standardProductForm';
import type { ServiceProductFormValues } from '../types/serviceProductForm';
import { SERVICE_MIN_IMAGES, type ServiceWizardStepId } from './serviceProductConstants';

const INTEGER_PATTERN = /^[0-9]+$/;
const NUMERIC_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

export function validateServiceProductStep(
  step: ServiceWizardStepId,
  values: ServiceProductFormValues,
  images: StandardProductImageEntry[],
  options?: { requireSeller?: boolean; hasSeller?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (step) {
    case 'basics': {
      if (options?.requireSeller && !options.hasSeller) {
        errors.sellerId = 'Select a seller';
      }
      if (!values.productName.trim()) {
        errors.productName = 'Required';
      }
      if (!values.description.trim()) {
        errors.description = 'Required';
      }
      break;
    }
    case 'catalog': {
      if (!values.categoryId) {
        errors.categoryId = 'Required';
      }
      if (!values.subCategoryId) {
        errors.subCategoryId = 'Required';
      }
      const uploadedCount = images.filter((image) => image.imageUrl || image.localUri).length;
      if (uploadedCount < SERVICE_MIN_IMAGES) {
        errors.images = `Add at least ${SERVICE_MIN_IMAGES} image`;
      }
      break;
    }
    case 'booking': {
      const duration = values.durationMinutes.trim();
      if (!duration) {
        errors.durationMinutes = 'Required';
      } else if (!INTEGER_PATTERN.test(duration) || Number(duration) <= 0) {
        errors.durationMinutes = 'Enter a valid duration in minutes';
      }
      if (!values.serviceLocation) {
        errors.serviceLocation = 'Required';
      }
      break;
    }
    case 'pricing': {
      const price = values.price.trim();
      if (!price) {
        errors.price = 'Required';
      } else if (!NUMERIC_PATTERN.test(price) || Number(price) <= 0) {
        errors.price = 'Enter a valid price';
      }
      if (values.currency !== 'cad' && !values.currencyPrice.trim()) {
        errors.currencyPrice = 'Required';
      }
      break;
    }
    case 'review':
      break;
    default:
      break;
  }

  return errors;
}

export function validateServiceProductForm(
  values: ServiceProductFormValues,
  images: StandardProductImageEntry[],
  options?: { requireSeller?: boolean; hasSeller?: boolean },
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const step of ['basics', 'catalog', 'booking', 'pricing'] as ServiceWizardStepId[]) {
    Object.assign(merged, validateServiceProductStep(step, values, images, options));
  }
  return merged;
}
