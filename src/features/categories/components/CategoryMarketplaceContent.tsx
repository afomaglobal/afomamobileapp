import { useCallback } from 'react';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { MainTabParamList, ShoppingStackParamList } from '../../../app/navigation/types';
import type { Category } from '../../../services/types/category';
import type { Product } from '../../../services/types/product';
import { navigateToCatalogListing } from '../../services/utils/serviceDetailNavigation';
import { useCategories } from '../hooks/useCategories';
import { getNavigableCategories } from '../utils/categoryNavigation';
import { navigateToParentCategory } from '../utils/subCategoryNavigation';
import { CategoryDiscoverList } from './CategoryDiscoverList';

export type CategoryMarketplaceNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'MarketplaceTab'>,
  NativeStackNavigationProp<ShoppingStackParamList>
>;

export interface CategoryMarketplaceContentProps {
  navigation: CategoryMarketplaceNavigationProp;
}

export function CategoryMarketplaceContent({ navigation }: CategoryMarketplaceContentProps) {
  const { categories, isLoading, error, retry } = useCategories();
  const navigableCategories = getNavigableCategories(categories);
  const stackNavigation = navigation as unknown as NativeStackNavigationProp<ShoppingStackParamList>;

  const handleCategoryPress = useCallback(
    (category: Category) => {
      navigateToParentCategory(stackNavigation, category);
    },
    [stackNavigation],
  );

  const handleProductPress = useCallback(
    (product: Product) => {
      navigateToCatalogListing(stackNavigation, product);
    },
    [stackNavigation],
  );

  return (
    <CategoryDiscoverList
      categories={navigableCategories}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      onCategoryPress={handleCategoryPress}
      onProductPress={handleProductPress}
    />
  );
}
