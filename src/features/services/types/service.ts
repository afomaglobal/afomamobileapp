import type { Product } from '../../../services/types/product';

export type ServicePriceType = 'fixed' | 'from' | 'custom_quote';
export type ServiceLocationMode = 'at_salon' | 'mobile' | 'both';
export type ServiceScheduleMode = 'inherit' | 'custom';

export interface ServiceWeeklyHour {
  day: number;
  enabled?: boolean;
  start?: string;
  end?: string;
}

export interface ServiceAddOn {
  _id?: string;
  name?: string;
  description?: string;
  price?: number;
  extraMinutes?: number;
  active?: boolean;
  sortOrder?: number;
}

export interface ServiceDetails {
  durationMinutes?: number;
  bufferMinutes?: number;
  priceType?: ServicePriceType;
  serviceLocation?: ServiceLocationMode;
  acceptPayAtVenue?: boolean;
  acceptOnlinePayment?: boolean;
  staffIds?: string[];
  scheduleMode?: ServiceScheduleMode;
  customWeeklyHours?: ServiceWeeklyHour[];
  customBlockedDates?: Array<{ date?: string; reason?: string }>;
  addOns?: ServiceAddOn[];
}

export interface ServiceBookingAddOnSnapshot {
  _id?: string;
  name?: string;
  price?: number;
  extraMinutes?: number;
}

export interface ServiceBookingDetails {
  bookingRef?: string;
  holdExpiresAt?: string;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  displayDate?: string;
  displayTime?: string;
  staffId?: string | null;
  staffName?: string | null;
  serviceFulfillment?: 'at_salon' | 'mobile' | null;
  addOns?: ServiceBookingAddOnSnapshot[];
  baseServiceAmount?: number;
  addOnsAmount?: number;
  notes?: string;
}

export interface ServiceVertical {
  _id?: string;
  name?: string;
  slug?: string;
  description?: string;
}

export interface ServiceSubcategory {
  _id?: string;
  name?: string;
  slug?: string;
  parent?: string;
}

export interface ServiceVerticalDetailResponse {
  vertical?: ServiceVertical;
  subcategories?: ServiceSubcategory[];
}

export interface ServiceListingsPagination {
  hasMore?: boolean;
  page?: number;
  totalPages?: number;
}

export interface ServiceListingsResponse {
  services?: Product[];
  pagination?: ServiceListingsPagination;
}

export interface ServiceSlot {
  date: string;
  time: string;
  startsAt: string;
  endsAt?: string;
}

export interface ServiceSlotsResponse {
  slots?: ServiceSlot[];
  timezone?: string;
  usesStaff?: boolean;
}

export interface ServiceStaffMember {
  _id?: string;
  displayName?: string;
  title?: string;
  active?: boolean;
}

export interface ServiceSlotSelectionHold {
  startsAt: string;
  endsAt?: string;
  staffId?: string | null;
  serviceFulfillment?: 'at_salon' | 'mobile' | null;
  selectedAddOns?: ServiceBookingAddOnSnapshot[];
  priceSnapshot?: {
    amount?: number;
    baseAmount?: number;
    addOnsAmount?: number;
    addOnExtraMinutes?: number;
    durationMinutes?: number;
    currency?: string;
  };
  bookingRef?: string;
  holdExpiresAt?: string;
  display?: {
    date?: string;
    time?: string;
    timezone?: string;
    staffName?: string;
  };
}
