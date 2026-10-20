import type { Product } from '../../../../services/types/product';

/** Approval workflow — independent from store visibility (`status` number on product). */
export type AdminProductApprovalFilter =
  | ''
  | 'Approved'
  | 'Pending'
  | 'Review'
  | 'Disapproved'
  | 'Draft';

/** Store visibility filter — maps to API query `status` (Active / Inactive). */
export type AdminProductInventoryFilter = '' | 'Active' | 'Inactive';

/** Inventory alert filter — maps to API query `stockAlert`. */
export type AdminProductStockAlertFilter = '' | 'outOfStock' | 'lowStock';

export const ADMIN_LOW_STOCK_THRESHOLD = 5;

/** Platform listing list scope — maps to API query `view` (web admin product index). */
export type AdminListingKindFilter = 'all' | 'products' | 'services';

export interface AdminProductListItem extends Product {}

export interface AdminProductListQuery {
  page: number;
  limit: number;
  /** When set, API returns only product or service listings. */
  view?: Extract<AdminListingKindFilter, 'products' | 'services'>;
  search?: string;
  /** Approval filter — API param `productStatus`. */
  productStatus?: Exclude<AdminProductApprovalFilter, ''>;
  /** Store visibility filter — API param `status` (Active | Inactive). */
  inventoryStatus?: Exclude<AdminProductInventoryFilter, ''>;
  /** Inventory alert filter — API param `stockAlert` (outOfStock | lowStock). */
  stockAlert?: Exclude<AdminProductStockAlertFilter, ''>;
}

export interface AdminProductListResponse {
  products: AdminProductListItem[];
  totalProducts: number;
  totalPages: number;
}

export interface AdminProductManagementParams {
  /** Lock list to products or services (from Listing Management hub). */
  listingKind?: Extract<AdminListingKindFilter, 'products' | 'services'>;
  /** Seed approval filter when navigating from dashboard pending count. */
  initialApprovalFilter?: Exclude<AdminProductApprovalFilter, ''>;
  /** Optional seed for store visibility filter. */
  initialInventoryFilter?: Exclude<AdminProductInventoryFilter, ''>;
  /** Seed inventory alert filter when navigating from dashboard stock cards. */
  initialStockAlertFilter?: Exclude<AdminProductStockAlertFilter, ''>;
  /** One-line context when opened from dashboard inventory alerts. */
  initialListNotice?: string;
  /** Bumps each dashboard inventory navigation so filters re-apply on an existing screen. */
  stockAlertRequestedAt?: number;
}

export type AdminProductDetail = Product;
