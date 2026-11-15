import type { SellerProductCreatePayload } from '../api/sellerProductsApi';
import { createProduct } from '../api/sellerProductsApi';
import type { Product } from '../../../../services/types/product';

/**
 * Creates a product. Listing fees are never paid in the mobile apps (plans and fees are
 * handled on the website only — App Store 3.1.1 / Play payments policy), so a
 * LISTING_FEE_REQUIRED error is surfaced to the caller like any other tier error.
 */
export async function createProductWithTierGate(payload: SellerProductCreatePayload): Promise<Product> {
  return createProduct(payload);
}
