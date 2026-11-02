import type { SellerProfile } from '../types/sellerProfile';
import { isSellerProductCreationAllowed } from './sellerSetupSections';
import {
  canSellerActivateMarketplace,
  SELLER_MARKETPLACE_GEO_BLOCKED_MESSAGE,
} from './sellerMarketplaceGeo';

/**
 * Product creation gate (web parity: pages/seller/product/index.jsx).
 * Uses `profileSetup` plus saved shipping config when flags are out of sync.
 */
export function canSellerCreateProducts(profile?: SellerProfile | null): boolean {
  if (!canSellerActivateMarketplace(profile)) {
    return false;
  }
  return isSellerProductCreationAllowed(profile?.profileSetup, profile);
}

export const SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE =
  'Please complete your profile setup before creating products.';

export function getSellerProductCreationBlockReason(profile?: SellerProfile | null): string | null {
  if (!canSellerActivateMarketplace(profile)) {
    return SELLER_MARKETPLACE_GEO_BLOCKED_MESSAGE;
  }
  if (!isSellerProductCreationAllowed(profile?.profileSetup, profile)) {
    return SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE;
  }
  return null;
}
