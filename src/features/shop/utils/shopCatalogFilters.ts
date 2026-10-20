import type { Product } from '../../../services/types/product';

/** Public shop “Products” tab — physical/digital listings only. */
export function filterShopProductListings(products: Product[]): Product[] {
  return products.filter((product) => product.productType !== 'Service');
}
