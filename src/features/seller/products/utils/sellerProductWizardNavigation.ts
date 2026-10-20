import type { SellerNavigation, SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import type { SellerProductType } from '../types/sellerProductType';

const PRODUCT_TYPE_ROUTES: Record<
  SellerProductType,
  keyof Pick<
    SellerStackParamList,
    | 'SellerStandardProduct'
    | 'SellerCustomizableProduct'
    | 'SellerDownloadableProduct'
    | 'SellerServiceProduct'
  >
> = {
  Standard: 'SellerStandardProduct',
  Customizable: 'SellerCustomizableProduct',
  Downloadable: 'SellerDownloadableProduct',
  Service: 'SellerServiceProduct',
};

export function navigateToSellerProductWizard(
  navigation: SellerNavigation,
  productType: SellerProductType,
): void {
  navigation.navigate(PRODUCT_TYPE_ROUTES[productType]);
}
