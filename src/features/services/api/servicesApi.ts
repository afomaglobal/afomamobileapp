import { apiGet } from '../../../services/api/request';
import type { Product } from '../../../services/types/product';
import type {
  ServiceListingsResponse,
  ServiceVertical,
  ServiceVerticalDetailResponse,
} from '../types/service';

export async function fetchServiceVerticals(): Promise<ServiceVertical[]> {
  const data = await apiGet<ServiceVertical[] | { error?: string }>(
    '/services/verticals',
    undefined,
    'Failed to load services',
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchServiceVerticalBySlug(slug: string): Promise<ServiceVerticalDetailResponse> {
  return apiGet<ServiceVerticalDetailResponse>(
    `/services/verticals/${encodeURIComponent(slug)}`,
    undefined,
    'Failed to load service category',
  );
}

export async function fetchServicesByCategoryId(
  categoryId: string,
  options: { page?: number; limit?: number; sort?: string } = {},
): Promise<ServiceListingsResponse> {
  const params: Record<string, string> = {
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  };
  if (options.sort) {
    params.sort = options.sort;
  }
  return apiGet<ServiceListingsResponse>(
    `/services/listings/${encodeURIComponent(categoryId)}`,
    { params },
    'Failed to load services',
  );
}

export async function fetchServicesBySellerId(
  sellerId: string,
  options: { page?: number; limit?: number } = {},
): Promise<ServiceListingsResponse> {
  const params = {
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 9),
  };
  return apiGet<ServiceListingsResponse>(
    `/services/seller/${encodeURIComponent(sellerId)}`,
    { params },
    'Failed to load seller services',
  );
}

export function isServiceListingProduct(product: Product | null | undefined): boolean {
  return product?.productType === 'Service';
}
