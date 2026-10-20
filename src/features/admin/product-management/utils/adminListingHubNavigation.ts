import type { AdminNavigation } from '../../navigation/adminTypes';
import type { AdminListingKindFilter } from '../types/adminProductManagement';
import {
  navigateToAdminProductTypePicker,
  navigateToAdminProductWizard,
} from './adminProductCreateNavigation';

export function navigateToAdminListingHub(navigation: AdminNavigation): void {
  navigation.navigate('AdminListingManagement');
}

export function navigateToAdminListingList(
  navigation: AdminNavigation,
  listingKind: Extract<AdminListingKindFilter, 'products' | 'services'>,
): void {
  navigation.navigate('AdminProductManagement', { listingKind });
}

export function openAdminAddProductFlow(navigation: AdminNavigation, sellerId?: string): void {
  navigateToAdminProductTypePicker(navigation, sellerId);
}

export function openAdminAddServiceFlow(navigation: AdminNavigation, sellerId?: string): void {
  navigateToAdminProductWizard(navigation, 'Service', sellerId);
}
