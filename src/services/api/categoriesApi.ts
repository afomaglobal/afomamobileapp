import type { Category, CategoryListResponse } from '../types/category';
import { apiGet } from './request';
import { excludeHiddenCategories } from '../../features/products/utils/mobileCatalogPolicy';

// Digital-only categories are hidden in the mobile apps (see mobileCatalogPolicy).

/** GET /categories */
export async function getCategories(): Promise<CategoryListResponse> {
  return excludeHiddenCategories(
    await apiGet<CategoryListResponse>('/categories', undefined, 'Failed to load categories'),
  );
}

/** GET /sub-categories */
export async function getSubCategories(): Promise<CategoryListResponse> {
  return excludeHiddenCategories(
    await apiGet<CategoryListResponse>('/sub-categories', undefined, 'Failed to load sub-categories'),
  );
}

/** GET /child-category */
export async function getChildCategories(): Promise<CategoryListResponse> {
  return excludeHiddenCategories(
    await apiGet<CategoryListResponse>('/child-category', undefined, 'Failed to load child categories'),
  );
}

/** GET /sub-categories/search/parent/{parentId} */
export async function getSubCategoriesByParent(parentId: string): Promise<Category[]> {
  return excludeHiddenCategories(
    await apiGet<Category[]>(
      `/sub-categories/search/parent/${encodeURIComponent(parentId)}`,
      undefined,
      'Failed to load sub-categories for parent',
    ),
  );
}

/** GET /child-category/search/parent/{parentId} */
export async function getChildCategoriesByParent(parentId: string): Promise<Category[]> {
  return excludeHiddenCategories(
    await apiGet<Category[]>(
      `/child-category/search/parent/${encodeURIComponent(parentId)}`,
      undefined,
      'Failed to load child categories for parent',
    ),
  );
}

type LiveCategoriesResponse = { paths?: string[] };

/**
 * Slug paths of categories that have live products — "category", "category/sub",
 * "category/sub/child" (GET /products/live-categories). Shoppers only see these.
 * Returns null when the list can't be loaded (e.g. an older backend), so callers can
 * fall back to not filtering instead of showing no categories at all.
 */
export async function getLiveCategoryPaths(): Promise<Set<string> | null> {
  try {
    const data = await apiGet<LiveCategoriesResponse>(
      '/products/live-categories',
      undefined,
      'Failed to load categories',
    );
    if (!Array.isArray(data?.paths)) return null;
    return new Set(data.paths.map((path) => String(path).toLowerCase()));
  } catch {
    return null;
  }
}
