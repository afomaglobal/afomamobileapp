import type { AdminNavigation } from '../../navigation/adminTypes';
import type { AdminProductAiListingType } from '../types/adminProductAiPrefill';
import { navigateToAdminProductAiListing } from './adminProductAiListingNavigation';

export function navigateToAdminProductTypePicker(
  navigation: AdminNavigation,
  sellerId?: string,
): void {
  navigation.navigate('AdminProductType', {
    sellerId: sellerId?.trim() || undefined,
  });
}

export function navigateToAdminProductSubtypePicker(
  navigation: AdminNavigation,
  sellerId?: string,
): void {
  navigation.navigate('AdminProductSubtype', {
    category: 'physical',
    sellerId: sellerId?.trim() || undefined,
  });
}

/** After product type is chosen, offer AI photo prefill once (web parity) with manual skip. */
export function navigateToAdminProductWizard(
  navigation: AdminNavigation,
  productType: AdminProductAiListingType,
  sellerId?: string,
): void {
  navigateToAdminProductAiListing(navigation, productType, sellerId);
}

export function navigateToAdminServiceProduct(
  navigation: AdminNavigation,
  sellerId?: string,
): void {
  navigation.navigate('AdminServiceProduct', {
    sellerId: sellerId?.trim() || undefined,
  });
}
