import type { SellerNavigation } from '../../../../app/navigation/sellerTypes';
import type { AdminProductAiListingType } from '../../../admin/product-management/types/adminProductAiPrefill';
import { clearAdminProductAiPrefill } from '../../../admin/product-management/state/adminProductAiPrefill';
import { navigateToSellerProductWizard } from './sellerProductWizardNavigation';

export function navigateToSellerProductAiListing(
  navigation: SellerNavigation,
  productType: AdminProductAiListingType,
): void {
  navigation.navigate('SellerProductAiListing', { productType });
}

export function navigateToSellerWizardAfterAiPrefill(
  navigation: SellerNavigation,
  productType: AdminProductAiListingType,
  skipPrefill = false,
): void {
  if (skipPrefill) {
    clearAdminProductAiPrefill();
  }

  if (productType === 'Service') {
    navigation.navigate('SellerServiceProduct');
    return;
  }

  navigateToSellerProductWizard(navigation, productType);
}
