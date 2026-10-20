/**
 * Product fields referenced by the web storefront.
 * TODO: Verify full backend product schema.
 */
export interface ProductImage {
  imageUrl?: string;
  fileName?: string;
  altText?: string;
}

export interface ProductStorePolicy {
  cancellationPolicy?: boolean | string;
  cancellationPolicyTime?: number | string;
  returnPolicy?: boolean | string;
  returnPolicyDetails?: string;
  faqList?: Array<{ question?: string; answer?: string }>;
}

export interface ProductSellerRef {
  _id?: string;
  id?: string;
  uuid?: string | number;
  userId?: string;
  userRole?: string;
  storeSlug?: string;
  storeTitle?: string;
  storeLogo?: string;
  userProfile?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  shippingConfigId?: Record<string, unknown>;
  storePolicy?: ProductStorePolicy;
}

export interface ProductVariation {
  finalPrice?: number;
  price?: number;
  totalPrice?: number;
  surTotalAmount?: number;
  surTotalAmountBDis?: number;
  inventory?: string;
  quantity?: number;
  image?: string | { imageUrl?: string };
  [key: string]: unknown;
}

export interface ProductDownloadableLink {
  downloadLimit?: number | string;
  featuredProduct?: string;
  featuredProductUrl?: string;
}

export interface ProductCategoryRef {
  _id?: string;
  name?: string;
  slug?: string;
}

export interface ServiceAddOnRef {
  _id?: string;
  name?: string;
  description?: string;
  price?: number;
  extraMinutes?: number;
  active?: boolean;
  sortOrder?: number;
}

export interface ServiceDetailsRef {
  durationMinutes?: number;
  bufferMinutes?: number;
  priceType?: 'fixed' | 'from' | 'custom_quote';
  serviceLocation?: 'at_salon' | 'mobile' | 'both';
  acceptPayAtVenue?: boolean;
  acceptOnlinePayment?: boolean;
  staffIds?: string[];
  scheduleMode?: 'inherit' | 'custom';
  customWeeklyHours?: Array<{
    day?: number;
    enabled?: boolean;
    start?: string;
    end?: string;
  }>;
  customBlockedDates?: Array<{ date?: string; reason?: string }>;
  addOns?: ServiceAddOnRef[];
}

export interface Product {
  _id?: string;
  productName?: string;
  slug?: string;
  sku?: string;
  uuid?: string | number;
  description?: string;
  productStatus?: string;
  shippingStatus?: string;
  status?: number;
  productType?: 'Standard' | 'Customizable' | 'Downloadable' | 'Service' | string;
  serviceDetails?: ServiceDetailsRef;
  price?: number;
  totalAmount?: number;
  totalPrice?: number;
  finalPrice?: number;
  basePrice?: number;
  surTotalAmount?: number;
  surTotalAmountBDis?: number;
  discountCode?: number;
  couponCode?: string | boolean;
  couponDiscount?: number;
  variations?: ProductVariation[];
  images?: ProductImage[];
  seller?: ProductSellerRef;
  Category?: ProductCategoryRef;
  SubCategory?: ProductCategoryRef;
  childCategory?: ProductCategoryRef;
  inventory?: string;
  quantity?: number;
  weight?: number;
  freeDelivery?: boolean;
  handlingFee?: number;
  additionalCost?: number;
  dispatchDays?: number | string;
  length?: number;
  width?: number;
  height?: number;
  metaTitle?: string;
  metaKeywords?: string;
  metaDesc?: string;
  commodityCode?: string;
  currency?: string;
  currencyPrice?: number | string;
  currencyRate?: number;
  downloadableLink?: ProductDownloadableLink;
  videos?: Array<{ videoUrl?: string }>;
}

export interface GlobalSearchResponse {
  matchedProducts?: Product[];
  suggestedProducts?: Product[];
}

export interface ProductsBySellerCountResponse {
  totalProducts?: number;
}

/** Response shape for `/products/search/related/*` and `/products/category/*`. */
export interface ProductsListPagination {
  hasNextPage?: boolean;
  page?: number;
  currentPage?: number;
  totalPages?: number;
  totalProducts?: number;
  limit?: number;
}

export interface ProductsListResponse {
  products?: Product[];
  pagination?: ProductsListPagination;
  category?: ProductCategoryRef;
}

export interface SellerProductsPage {
  products: Product[];
  pagination?: ProductsListPagination;
}
