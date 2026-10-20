import type { SellerNavigation } from '../../../../app/navigation/sellerTypes';
import type { AdminProductAiListingType } from '../../../admin/product-management/types/adminProductAiPrefill';
import { fetchSellerMembership } from '../../membership/api/sellerMembershipApi';
import { canOfferSellerAiListing } from './sellerAiListingAccess';
import { navigateToSellerProductAiListing } from './sellerProductAiListingNavigation';
import { navigateToSellerProductWizard } from './sellerProductWizardNavigation';

export function navigateToSellerProductTypePicker(navigation: SellerNavigation): void {
  navigation.navigate('SellerProductType', {});
}

export function navigateToSellerProductSubtypePicker(navigation: SellerNavigation): void {
  navigation.navigate('SellerProductSubtype');
}

export { navigateToSellerProductWizard } from './sellerProductWizardNavigation';

/**
 * Web parity: paid sellers see AI listing photos first (Skip → manual form).
 * Test Drive / inactive subscription goes straight to the create form.
 */
export async function navigateToSellerNewListingCreate(
  navigation: SellerNavigation,
  productType: AdminProductAiListingType,
  sellerId?: string,
): Promise<void> {
  let offerAi = false;

  if (sellerId?.trim()) {
    try {
      const membership = await fetchSellerMembership(sellerId.trim());
      offerAi = canOfferSellerAiListing(membership);
    } catch {
      offerAi = false;
    }
  }

  if (offerAi) {
    navigateToSellerProductAiListing(navigation, productType);
    return;
  }

  if (productType === 'Service') {
    navigation.navigate('SellerServiceProduct');
    return;
  }

  navigateToSellerProductWizard(navigation, productType);
}
