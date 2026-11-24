import { ApiError } from './errors';
import type {
  GlobalSearchResponse,
  Product,
  ProductsBySellerCountResponse,
  ProductsListResponse,
  SellerProductsPage,
} from '../types/product';
import type { PaginationParams } from '../types/common';
import { apiDelete, apiGet } from './request';
import { excludeHiddenProducts } from '../../features/products/utils/mobileCatalogPolicy';

function normalizeProductList(data: Product[] | ProductsListResponse | undefined): Product[] {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }
  return data.products ?? [];
}

// Buyer-facing lists below drop digital (downloadable) products: they are not sold in the
// mobile apps (see features/products/utils/mobileCatalogPolicy.ts).

export async function getBestProducts(): Promise<Product[]> {
  return excludeHiddenProducts(
    await apiGet<Product[]>('/products/best/Product', undefined, 'Failed to load best products'),
  );
}

export async function getDiscountedProducts(limit: number): Promise<Product[]> {
  return excludeHiddenProducts(
    await apiGet<Product[]>(
      '/products/discounted/Product',
      { params: { limit } },
      'Failed to load discounted products',
    ),
  );
}

export async function getNewArrivalProducts(limit: number): Promise<Product[]> {
  return excludeHiddenProducts(
    await apiGet<Product[]>(
      '/products/newArrival/Product',
      { params: { limit } },
      'Failed to load new arrival products',
    ),
  );
}

/**
 * Home "popular categories": only subcategories with live products
 * (GET /products/home-categories). Falls back to /products/bestSelling/Product on an older
 * backend that doesn't have the endpoint yet. Same row shape either way.
 */
export async function getHomeCategoryRows(limit = 8): Promise<Product[]> {
  try {
    return excludeHiddenProducts(
      await apiGet<Product[]>(
        `/products/home-categories?limit=${limit}`,
        undefined,
        'Failed to load categories',
      ),
    );
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return getBestSellingProducts();
    }
    throw err;
  }
}

export async function getBestSellingProducts(): Promise<Product[]> {
  return excludeHiddenProducts(
    await apiGet<Product[]>('/products/bestSelling/Product', undefined, 'Failed to load best selling products'),
  );
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return apiGet<Product>(`/products/slug/${encodeURIComponent(slug)}`, undefined, 'Failed to load product');
}

export async function getProductById(id: string): Promise<Product> {
  return apiGet<Product>(`/products/${encodeURIComponent(id)}`, undefined, 'Failed to load product');
}

export async function getProductsBySellerId(
  sellerId: string,
  params: PaginationParams = {},
): Promise<Product[]> {
  const page = await getSellerProductsPage(sellerId, params);
  return page.products;
}

export async function getSellerProductsPage(
  sellerId: string,
  params: PaginationParams = {},
): Promise<SellerProductsPage> {
  const data = await apiGet<Product[] | ProductsListResponse>(
    `/products/by/${encodeURIComponent(sellerId)}`,
    { params },
    'Failed to load seller products',
  );

  return {
    products: excludeHiddenProducts(normalizeProductList(data)),
    pagination: Array.isArray(data) ? undefined : data.pagination,
  };
}

/** GET /products/by/{sellerId}/all — seller product management list (web parity). */
export async function getSellerProductsManagementPage(
  sellerId: string,
  params: PaginationParams = {},
): Promise<SellerProductsPage> {
  const data = await apiGet<Product[] | ProductsListResponse>(
    `/products/by/${encodeURIComponent(sellerId)}/all`,
    { params },
    'Failed to load seller products',
  );

  return {
    products: normalizeProductList(data),
    pagination: Array.isArray(data) ? undefined : data.pagination,
  };
}

/** DELETE /products/{productId} */
export async function deleteSellerProduct(productId: string): Promise<void> {
  await apiDelete<void>(
    `/products/${encodeURIComponent(productId)}`,
    undefined,
    'Failed to delete product',
  );
}

export async function getProductsBySellerCount(sellerId: string): Promise<ProductsBySellerCountResponse> {
  return apiGet<ProductsBySellerCountResponse>(
    `/products/by/${encodeURIComponent(sellerId)}/count`,
    undefined,
    'Failed to load seller product count',
  );
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const joined = ids.map(encodeURIComponent).join(',');
  return excludeHiddenProducts(
    await apiGet<Product[]>(`/products/byIds/${joined}`, undefined, 'Failed to load products'),
  );
}

export async function getRelatedProducts(
  categoryOrProductId: string,
  params: PaginationParams = {},
): Promise<Product[]> {
  const page = await getRelatedProductsPage(categoryOrProductId, params);
  return page.products;
}

export async function getRelatedProductsPage(
  categoryOrProductId: string,
  params: PaginationParams = {},
): Promise<SellerProductsPage> {
  const data = await apiGet<ProductsListResponse | Product[]>(
    `/products/search/related/${encodeURIComponent(categoryOrProductId)}`,
    { params },
    'Failed to load related products',
  );

  return {
    products: excludeHiddenProducts(normalizeProductList(data)),
    pagination: Array.isArray(data) ? undefined : data.pagination,
  };
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const data = await apiGet<ProductsListResponse | Product[]>(
    `/products/category/${encodeURIComponent(categoryId)}`,
    undefined,
    'Failed to load category products',
  );
  return excludeHiddenProducts(normalizeProductList(data));
}

export async function globalProductSearch(name: string): Promise<GlobalSearchResponse> {
  const data = await apiGet<GlobalSearchResponse>(
    '/products/global/search',
    { params: { name } },
    'Failed to search products',
  );
  return {
    ...data,
    matchedProducts: excludeHiddenProducts(data?.matchedProducts),
    suggestedProducts: excludeHiddenProducts(data?.suggestedProducts),
  };
}

export interface HomeCollections {
  trending: Product[];
  teamPicks: Product[];
}

/**
 * Home "Trending Now" and "AFOMA Team Picks" (GET /products/home-collections): lists the admin
 * picks in Settings (home-trending / home-team-picks), same as the website. Order is kept;
 * products that are no longer live are already dropped by the server. An older backend without
 * the endpoint (404) gives empty lists.
 */
export async function getHomeCollections(): Promise<HomeCollections> {
  try {
    const data = await apiGet<Partial<HomeCollections>>(
      '/products/home-collections',
      undefined,
      'Failed to load home collections',
    );
    return {
      trending: excludeHiddenProducts(Array.isArray(data?.trending) ? data.trending : []),
      teamPicks: excludeHiddenProducts(Array.isArray(data?.teamPicks) ? data.teamPicks : []),
    };
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return { trending: [], teamPicks: [] };
    }
    throw err;
  }
}

export type HomeDealsSlotType = 'discounted' | 'featured' | 'gifts' | 'none';

export interface HomeDealsSlot {
  type: HomeDealsSlotType;
  title: string;
  products: Product[];
}

/**
 * Home "deals" slot (GET /products/home-deals): Most Discounted when there are enough deals,
 * otherwise "Featured from our sellers" or "Gift picks"; type "none" with no products when there
 * is nothing to show (the section is hidden).
 */
export async function getHomeDealsSlot(): Promise<HomeDealsSlot> {
  const data = await apiGet<Partial<HomeDealsSlot> | Product[]>(
    '/products/home-deals',
    undefined,
    'Failed to load home deals',
  );
  if (Array.isArray(data)) {
    return { type: 'discounted', title: 'Most Discounted', products: excludeHiddenProducts(data) };
  }
  return {
    type: data?.type ?? 'none',
    title: data?.title ?? '',
    products: excludeHiddenProducts(data?.products ?? []),
  };
}
