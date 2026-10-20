import type { AdminNavigation } from '../../navigation/adminTypes';
import { clearAdminProductAiPrefill } from '../state/adminProductAiPrefill';
import type { AdminProductAiListingType } from '../types/adminProductAiPrefill';

export function navigateToAdminProductAiListing(
  navigation: AdminNavigation,
  productType: AdminProductAiListingType,
  sellerId?: string,
): void {
  navigation.navigate('AdminProductAiListing', {
    productType,
    sellerId: sellerId?.trim() || undefined,
  });
}

export function navigateToAdminProductWizardAfterAiPrefill(
  navigation: AdminNavigation,
  productType: AdminProductAiListingType,
  sellerId?: string,
  skipAiPrefill = false,
): void {
  if (skipAiPrefill) {
    clearAdminProductAiPrefill();
  }

  const params = sellerId?.trim() ? { sellerId: sellerId.trim() } : undefined;

  if (productType === 'Standard') {
    navigation.navigate('AdminStandardProduct', params);
    return;
  }

  if (productType === 'Downloadable') {
    navigation.navigate('AdminDownloadableProduct', params);
    return;
  }

  if (productType === 'Service') {
    navigation.navigate('AdminServiceProduct', params ?? {});
    return;
  }

  navigation.navigate('AdminCustomizableProduct', params);
}
