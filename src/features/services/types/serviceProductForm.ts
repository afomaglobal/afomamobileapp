import type { ServiceAddOnDraft } from '../utils/serviceAddOns';
import type { WeeklyHourRow } from '../components/WeeklyHoursEditor';

export type ServiceProductPriceType = 'fixed' | 'from' | 'custom_quote';
export type ServiceProductLocation = 'at_salon' | 'mobile' | 'both';
export type ServiceProductScheduleMode = 'inherit' | 'custom';

export interface ServiceProductFormValues {
  productName: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  price: string;
  currency: string;
  currencyPrice: string;
  durationMinutes: string;
  priceType: ServiceProductPriceType;
  serviceLocation: ServiceProductLocation;
  acceptOnlinePayment: boolean;
  scheduleMode: ServiceProductScheduleMode;
  customWeeklyHours: WeeklyHourRow[];
  staffIds: string[];
  serviceAddOns: ServiceAddOnDraft[];
  metaTitle: string;
  metaKeywords: string;
  metaDesc: string;
}

export function createEmptyServiceProductForm(): ServiceProductFormValues {
  return {
    productName: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    price: '',
    currency: 'cad',
    currencyPrice: '',
    durationMinutes: '60',
    priceType: 'fixed',
    serviceLocation: 'at_salon',
    acceptOnlinePayment: false,
    scheduleMode: 'inherit',
    customWeeklyHours: [],
    staffIds: [],
    serviceAddOns: [],
    metaTitle: '',
    metaKeywords: '',
    metaDesc: '',
  };
}
