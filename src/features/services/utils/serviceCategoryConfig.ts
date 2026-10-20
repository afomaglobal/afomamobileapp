import type { Category } from '../../../services/types/category';

import { DEFAULT_SERVICE_VERTICAL_SLUG } from './serviceBookingConstants';



/**

 * Parent category slugs that list bookable services (not physical products).

 * Add new service verticals here — subs under these parents use the services listing API.

 */

export const SERVICE_VERTICAL_SLUGS = new Set<string>([DEFAULT_SERVICE_VERTICAL_SLUG]);



function normalizeCategorySlug(category: Pick<Category, 'slug'> | null | undefined): string {

  return (category?.slug ?? '').trim().toLowerCase();

}



export function isServiceVerticalCategory(

  category: Pick<Category, 'slug'> | null | undefined,

): boolean {

  const slug = normalizeCategorySlug(category);

  return slug.length > 0 && SERVICE_VERTICAL_SLUGS.has(slug);

}



/** True when this parent category id (from the tree cache) is a service vertical. */

export function isServiceListingForParentCategory(

  parent: Pick<Category, 'slug'> | null | undefined,

): boolean {

  return isServiceVerticalCategory(parent);

}



export function isServiceCategoryListing(

  category: Pick<Category, 'slug'> | null | undefined,

): boolean {

  return isServiceVerticalCategory(category);

}



export function getServiceVerticalSlugForCategory(

  category: Pick<Category, 'slug'> | null | undefined,

): string {

  const slug = normalizeCategorySlug(category);

  if (slug && SERVICE_VERTICAL_SLUGS.has(slug)) {

    return slug;

  }

  return DEFAULT_SERVICE_VERTICAL_SLUG;

}


