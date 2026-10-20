import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ShoppingStackParamList } from '../../../app/navigation/types';
import type { Product } from '../../../services/types/product';
import { getProductRouteId } from '../../products/utils/productDisplay';
import { isServiceProduct } from './isServiceProduct';

const DEFAULT_SERVICE_VERTICAL_SLUG = 'beauty-and-personal-care';

export function getServiceDetailRouteParams(
  product: Product,
): ShoppingStackParamList['ServiceDetail'] | null {
  if (!isServiceProduct(product)) {
    return null;
  }

  const verticalSlug = product.Category?.slug?.trim() || DEFAULT_SERVICE_VERTICAL_SLUG;
  const subSlug = product.SubCategory?.slug?.trim() || '';
  const serviceSlug = product.slug?.trim();
  const productId = getProductRouteId(product);

  if (!serviceSlug && !productId) {
    return null;
  }

  return {
    verticalSlug,
    subSlug,
    serviceSlug,
    productId,
  };
}

type Nav = NavigationProp<ParamListBase>;

function asShoppingStackNavigation(navigation: Nav): NavigationProp<ShoppingStackParamList> {
  return navigation as NavigationProp<ShoppingStackParamList>;
}

/** Routes marketplace listings to Product detail or Service detail (web catalogListingHref parity). */
export function navigateToCatalogListing(navigation: Nav, product: Product): void {
  const stack = asShoppingStackNavigation(navigation);
  const serviceParams = getServiceDetailRouteParams(product);
  if (serviceParams) {
    stack.navigate('ServiceDetail', serviceParams);
    return;
  }

  const productId = getProductRouteId(product);
  if (!productId) {
    return;
  }

  stack.navigate('ProductDetail', {
    productId,
    slug: product.slug,
  });
}

export function replaceWithServiceDetailIfNeeded(
  navigation: Nav,
  product: Product | null | undefined,
): boolean {
  if (!product) {
    return false;
  }

  const serviceParams = getServiceDetailRouteParams(product);
  if (!serviceParams) {
    return false;
  }

  (navigation as NativeStackNavigationProp<ShoppingStackParamList>).replace(
    'ServiceDetail',
    serviceParams,
  );
  return true;
}
