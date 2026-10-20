import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SearchScreenContent } from '../components/SearchScreenContent';
import { navigateToCatalogListing } from '../../services/utils/serviceDetailNavigation';
import type { ShoppingStackParamList } from '../../../app/navigation/types';

type Props = NativeStackScreenProps<ShoppingStackParamList, 'Search'>;

export function SearchScreen({ route, navigation }: Props) {
  const initialQuery = route.params?.query ?? '';

  return (
    <SearchScreenContent
      initialQuery={initialQuery}
      showBackButton
      onBackPress={() => navigation.goBack()}
      onProductPress={(product) => navigateToCatalogListing(navigation, product)}
    />
  );
}
