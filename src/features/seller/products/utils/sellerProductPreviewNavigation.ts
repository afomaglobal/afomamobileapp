import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import type { Product } from '../../../../services/types/product';
import { getProductRouteId } from '../../../products/utils/productDisplay';

type SellerNavigation = NativeStackNavigationProp<SellerStackParamList>;

export function navigateToSellerProductMobilePreview(
  navigation: SellerNavigation,
  product: Product,
): boolean {
  const productId = getProductRouteId(product)?.trim();
  const slug = product.slug?.trim();

  if (!productId && !slug) {
    return false;
  }

  navigation.getParent()?.navigate('Shopping', {
    screen: 'ProductDetail',
    params: {
      ...(productId ? { productId } : {}),
      ...(slug ? { slug } : {}),
    },
  });

  return true;
}
