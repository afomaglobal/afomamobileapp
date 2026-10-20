import { Alert } from 'react-native';
import type { SellerNavigation } from '../../../../app/navigation/sellerTypes';
import type { SellerProfile } from '../../types/sellerProfile';
import {
  canSellerCreateProducts,
  SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE,
} from '../../utils/sellerProductGate';
import { navigateToSellerSetupHub } from '../../utils/sellerSetupNavigation';
import { navigateToSellerNewListingCreate } from './sellerProductCreateNavigation';

export function navigateToIncompleteSellerSetup(
  navigation: SellerNavigation,
  _profile?: SellerProfile | null,
) {
  navigateToSellerSetupHub(navigation);
}

export function promptIncompleteSellerSetup(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
) {
  Alert.alert('Complete seller setup', SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Continue setup',
      onPress: () => navigateToIncompleteSellerSetup(navigation, profile),
    },
  ]);
}

function gateSellerListingCreation(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
): boolean {
  if (!canSellerCreateProducts(profile)) {
    promptIncompleteSellerSetup(navigation, profile);
    return false;
  }
  return true;
}

/** Gate product creation and open type selection when setup is complete. */
export function openSellerProductTypeSelection(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
) {
  if (!gateSellerListingCreation(navigation, profile)) {
    return;
  }

  navigation.navigate('SellerProductType', {});
}

/** Web parity: Listing Management → Add Product (physical + digital, no service). */
export function openSellerAddProductFlow(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
) {
  if (!gateSellerListingCreation(navigation, profile)) {
    return;
  }

  navigation.navigate('SellerProductType', { createMode: 'products' });
}

/** Web parity: Listing Management → Add Service (AI step when on a paid plan). */
export async function openSellerAddServiceFlow(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
  sellerId?: string,
) {
  if (!gateSellerListingCreation(navigation, profile)) {
    return;
  }

  const resolvedSellerId = sellerId?.trim() || profile?._id;
  await navigateToSellerNewListingCreate(navigation, 'Service', resolvedSellerId);
}
