import type { Product } from '../../../services/types/product';

export function isServiceProduct(product: Product | null | undefined): boolean {
  if (!product) {
    return false;
  }
  return product.productType === 'Service';
}
