import type { Product } from '../../../services/types/product';
import type { Category } from '../../../services/types/category';

/**
 * Mobile catalog policy — what the iOS/Android apps hide from buyers.
 *
 * 1. Digital (downloadable) products: digital goods sold in-app must use App Store In-App
 *    Purchase / Google Play Billing (App Store 3.1.1, Play payments policy).
 * 2. Hidden categories (business decision): currently "Art & Collectibles".
 *
 * Hidden items stay available on the website, and past purchases still appear in My Orders.
 */
export const DIGITAL_PRODUCT_TYPE = 'Downloadable';

/** Category / subcategory slugs that only contain digital goods. */
const DIGITAL_CATEGORY_SLUGS = new Set(['digital-art', 'digital-products', 'digital-downloads']);
const DIGITAL_CATEGORY_NAMES = new Set(['digital art', 'digital products', 'digital downloads']);

/** Top-level categories hidden in the apps (with all their subcategories and products). */
const HIDDEN_CATEGORY_SLUGS = new Set(['art-and-collectibles', 'art-collectibles']);
const HIDDEN_CATEGORY_NAMES = new Set(['art & collectibles', 'art and collectibles']);

/**
 * Ids of hidden categories, learned whenever a category list is filtered. Some product payloads
 * carry `Category` as a bare id instead of a populated object; this lets us match those too.
 */
const hiddenCategoryIds = new Set<string>();

type CategoryLike = Pick<Category, 'slug' | 'name'> & { _id?: string };

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isDigitalProduct(product: Pick<Product, 'productType'> | null | undefined): boolean {
  return product?.productType === DIGITAL_PRODUCT_TYPE;
}

export function isDigitalCategory(category: CategoryLike | null | undefined): boolean {
  if (!category) return false;
  return (
    DIGITAL_CATEGORY_SLUGS.has(normalize(category.slug)) ||
    DIGITAL_CATEGORY_NAMES.has(normalize(category.name))
  );
}

function isHiddenCategoryRef(ref: unknown): boolean {
  if (!ref) return false;
  if (typeof ref === 'string') return hiddenCategoryIds.has(ref);
  if (typeof ref !== 'object') return false;
  const record = ref as Record<string, unknown>;
  const id = typeof record._id === 'string' ? record._id : '';
  return (
    (id !== '' && hiddenCategoryIds.has(id)) ||
    HIDDEN_CATEGORY_SLUGS.has(normalize(record.slug)) ||
    HIDDEN_CATEGORY_NAMES.has(normalize(record.name))
  );
}

/** True for categories the apps hide: digital-only categories and hidden top-level categories. */
export function isHiddenCategory(category: CategoryLike | null | undefined): boolean {
  if (!category) return false;
  return isDigitalCategory(category) || isHiddenCategoryRef(category);
}

/** Filters a category list and remembers hidden category ids for product matching. */
export function excludeHiddenCategories<T extends CategoryLike>(
  categories: T[] | null | undefined,
): T[] {
  if (!Array.isArray(categories)) return [];
  return categories.filter((category) => {
    const hidden = isHiddenCategory(category);
    if (hidden && isHiddenCategoryRef(category) && typeof category._id === 'string') {
      hiddenCategoryIds.add(category._id);
    }
    return !hidden;
  });
}

function unwrapProduct(item: unknown): Record<string, unknown> | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const nested = (record.productDetails ?? record.product) as Record<string, unknown> | undefined;
  return nested && typeof nested === 'object' ? { ...nested, ...pickDefined(record) } : record;
}

/** Wrapper fields win only when defined (wrappers usually carry just counts and the name). */
function pickDefined(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ['productType', 'Category', 'SubCategory', 'childCategory']) {
    if (record[key] !== undefined) out[key] = record[key];
  }
  return out;
}

/** True when a product (flat, or wrapped in `productDetails` / `product`) is hidden in the apps. */
export function isProductHiddenInApp(item: unknown): boolean {
  const product = unwrapProduct(item);
  if (!product) return false;
  if (product.productType === DIGITAL_PRODUCT_TYPE) return true;
  return (
    isHiddenCategoryRef(product.Category) ||
    isDigitalCategory(product.SubCategory as CategoryLike | undefined) ||
    isDigitalCategory(product.childCategory as CategoryLike | undefined)
  );
}

/** Removes products hidden in the apps (digital, or in a hidden category). */
export function excludeHiddenProducts<T>(items: T[] | null | undefined): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isProductHiddenInApp(item));
}
