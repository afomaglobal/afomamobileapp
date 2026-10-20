import type { SellerProfile } from '../types/sellerProfile';
import { isSellerProductCreationAllowed } from './sellerSetupSections';

/**
 * Product creation gate (web parity: pages/seller/product/index.jsx).
 * Uses `profileSetup` plus saved shipping config when flags are out of sync.
 */
export function canSellerCreateProducts(profile?: SellerProfile | null): boolean {
  return isSellerProductCreationAllowed(profile?.profileSetup, profile);
}

export const SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE =
  'Please complete your profile setup before creating products.';
