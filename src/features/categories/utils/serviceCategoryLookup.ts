import { getCachedParentCategories } from '../../../services/cache/categoryTreeCache';
import type { Category } from '../../../services/types/category';
import { isServiceVerticalCategory } from '../../services/utils/serviceCategoryConfig';
import { getCategoryRouteId } from './categoryNavigation';

export function findParentCategoryById(categoryId: string): Category | undefined {
  return getCachedParentCategories().find(
    (category) => getCategoryRouteId(category) === categoryId,
  );
}

export function isServiceVerticalCategoryId(categoryId: string): boolean {
  const parent = findParentCategoryById(categoryId);
  return parent ? isServiceVerticalCategory(parent) : false;
}
