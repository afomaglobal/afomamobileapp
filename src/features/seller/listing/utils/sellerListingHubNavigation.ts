import type { SellerNavigation } from '../../../../app/navigation/sellerTypes';
import type { SellerListingKindFilter } from '../../products/utils/sellerProductListDisplay';
import {
  openSellerAddProductFlow,
  openSellerAddServiceFlow,
} from '../../products/utils/sellerProductCreationNavigation';

export function navigateToSellerListingHub(navigation: SellerNavigation): void {
  navigation.navigate('SellerListingManagement');
}

export function navigateToSellerListingList(
  navigation: SellerNavigation,
  listingKind: Extract<SellerListingKindFilter, 'products' | 'services'>,
): void {
  navigation.navigate('SellerProducts', { listingKind });
}

export { openSellerAddProductFlow, openSellerAddServiceFlow };
