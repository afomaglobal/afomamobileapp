import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/ui/AppText';
import { ErrorState } from '../../../components/ecommerce/ErrorState';
import { colors, spacing } from '../../../design-system';
import type { ShoppingStackParamList } from '../../../app/navigation/types';
import {
  marketplaceScrollProps,
  useMarketplaceFooterContentInset,
  useMarketplaceScrollHandler,
} from '../../../app/navigation/marketplaceChrome';
import { ServiceCard } from '../components/ServiceCard';
import { useServiceSubcategoryListings } from '../hooks/useServiceSubcategoryListings';

type Props = NativeStackScreenProps<ShoppingStackParamList, 'ServiceSubcategory'>;

export function ServiceSubcategoryScreen({ navigation, route }: Props) {
  const { subCategoryId, subCategoryName, verticalSlug, subSlug } = route.params;
  const insets = useSafeAreaInsets();
  const footerInset = useMarketplaceFooterContentInset();
  const onScroll = useMarketplaceScrollHandler();
  const { services, hasMore, isLoadingMore, isRefreshing, error, retry, loadMore } =
    useServiceSubcategoryListings(subCategoryId);

  if (error && !services.length) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ErrorState message={error} onAction={() => void retry()} />
      </View>
    );
  }

  return (
    <FlatList
      {...marketplaceScrollProps}
      onScroll={onScroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: footerInset + spacing.lg },
      ]}
      ListHeaderComponent={
        <View style={styles.header}>
          <AppText variant="h2">{subCategoryName || 'Services'}</AppText>
        </View>
      }
      data={services}
      keyExtractor={(item) => item._id || item.slug || item.productName || Math.random().toString()}
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          onPress={() =>
            navigation.navigate('ServiceDetail', {
              verticalSlug,
              subSlug: subSlug || item.SubCategory?.slug || '',
              serviceSlug: item.slug || '',
              productId: item._id,
            })
          }
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onEndReached={() => {
        if (hasMore) {
          void loadMore();
        }
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isLoadingMore || isRefreshing ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  loader: {
    marginVertical: spacing.lg,
  },
});
