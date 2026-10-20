export interface PaginationParams {
  page?: number;
  limit?: number;
  /** Seller management list: `products` | `services` (web `?view=` parity). */
  view?: 'products' | 'services';
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  total?: number;
  totalPages?: number;
}
