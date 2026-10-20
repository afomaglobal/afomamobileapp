import type { SellerProductCreatePayload } from '../api/sellerProductsApi';
import { createProduct } from '../api/sellerProductsApi';
import type { Product } from '../../../../services/types/product';
import {
  parseProductTierError,
  type ProductTierGateError,
} from './productTierErrors';

export async function createProductWithTierGate(
  payload: SellerProductCreatePayload,
  requestListingFeePayment: (error: ProductTierGateError) => Promise<string | null>,
): Promise<Product> {
  try {
    return await createProduct(payload);
  } catch (error) {
    const tierError = parseProductTierError(error);
    if (tierError?.code === 'LISTING_FEE_REQUIRED') {
      const listingFeePaymentRef = await requestListingFeePayment(tierError);
      if (!listingFeePaymentRef) {
        throw error;
      }

      return createProduct({
        ...payload,
        listingFeePaymentRef,
      });
    }

    throw error;
  }
}
