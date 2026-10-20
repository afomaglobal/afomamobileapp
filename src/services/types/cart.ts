import type { Product } from './product';
import type { ServiceBookingDetails } from '../../features/services/types/service';

/**
 * Cart line and cart API types traced from AppShell/cart pages.
 * TODO: Verify exact cart line item schema stored in backend.
 */
export interface CartShippingServiceOption {
  value?: string;
  label?: string;
  carrier_name?: string;
  service_id?: string | number;
}

export interface CartLineItem {
  orderQuantiy?: number;
  basePrice?: number;
  totalAmount?: number;
  maxQuantity?: number | string;
  remark?: string;
  productData?: Product;
  selectedVariations?: Array<{ attributeName?: string; attributeValue?: string }>;
  shippingOptions?: CartShippingServiceOption[];
  shippingService?: CartShippingServiceOption;
  shippingRate?: number;
  bookingDetails?: ServiceBookingDetails;
}

export type CartMap = Record<string, CartLineItem>;

export interface SaveCartRequest {
  user_id: string;
  cart: CartMap;
  subTotal: number | string;
  totalShippingRate: number | string;
  fetchedShippingRate?: number | string;
}

export interface GetCartResponse {
  cart?: CartMap;
  subTotal?: number;
  totalShippingRate?: number;
  fetchedShippingRate?: number;
}
