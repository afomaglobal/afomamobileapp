import type { StandardProductImageEntry } from '../../seller/products/types/standardProductForm';
import type { ServiceProductFormValues } from '../types/serviceProductForm';
import { serializeServiceAddOnsForApi } from './serviceAddOns';

export function buildServiceProductPayload(
  values: ServiceProductFormValues,
  images: StandardProductImageEntry[],
  sellerId: string,
  currencyRate: number,
  productStatus?: string,
): Record<string, unknown> {
  const shortDesc = values.description.trim().slice(0, 200);
  const payload: Record<string, unknown> = {
    productName: values.productName.trim(),
    shortDesc,
    description: values.description.trim(),
    Category: values.categoryId,
    SubCategory: values.subCategoryId,
    price: values.price.trim(),
    currency: values.currency || 'cad',
    currencyPrice: values.currencyPrice.trim() || values.price.trim() || 1,
    currencyRate: currencyRate || 1,
    inventory: 'InStock',
    quantity: 1,
    images: images
      .filter((image) => image.imageUrl && image.fileName)
      .map((image) => ({
        imageUrl: image.imageUrl!,
        fileName: image.fileName!,
        altText: image.altText?.trim() ?? '',
      })),
    videos: [],
    seller: sellerId,
    productType: 'Service',
    serviceDetails: {
      durationMinutes: Math.max(1, parseInt(values.durationMinutes, 10) || 60),
      bufferMinutes: 0,
      priceType: values.priceType,
      serviceLocation: values.serviceLocation,
      scheduleMode: values.scheduleMode === 'custom' ? 'custom' : 'inherit',
      customWeeklyHours:
        values.scheduleMode === 'custom' ? values.customWeeklyHours : [],
      staffIds: values.staffIds.filter(Boolean),
      acceptPayAtVenue: true,
      acceptOnlinePayment: Boolean(values.acceptOnlinePayment),
      addOns: serializeServiceAddOnsForApi(values.serviceAddOns),
    },
    metaTitle: values.metaTitle.trim() || values.productName.trim(),
    metaKeywords: values.metaKeywords.trim(),
    metaDesc: values.metaDesc.trim() || shortDesc,
  };

  if (productStatus) {
    payload.productStatus = productStatus;
  }

  return payload;
}
