import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
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
import { useServiceHub } from '../hooks/useServiceHub';
import { DEFAULT_SERVICE_VERTICAL_SLUG } from '../utils/serviceBookingConstants';

type Props = NativeStackScreenProps<ShoppingStackParamList, 'ServicesHub'>;

export function ServicesHubScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const footerInset = useMarketplaceFooterContentInset();
  const onScroll = useMarketplaceScrollHandler();
  const {
    vertical,
    subcategories,
    services,
    hasMore,
    isLoadingMore,
    isRefreshing,
    error,
    retry,
    loadMore,
  } = useServiceHub(DEFAULT_SERVICE_VERTICAL_SLUG);

  if (error && !services.length && !subcategories.length) {
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
          <AppText variant="h1">Services</AppText>
          <AppText variant="body" color="textMuted">
            {vertical?.name || 'Book beauty & personal care appointments'}
          </AppText>
          {subcategories.length ? (
            <View style={styles.subNav}>
              {subcategories.map((sub) => (
                <Pressable
                  key={sub._id || sub.slug}
                  style={styles.subChip}
                  onPress={() => {
                    const parentId = vertical?._id;
                    const subCategoryId = sub._id;
                    if (!parentId || !subCategoryId) {
                      return;
                    }
                    navigation.navigate('SubCategory', {
                      categoryId: parentId,
                      categoryName: vertical?.name,
                      subCategoryId,
                      subCategoryName: sub.name,
                    });
                  }}
                >
                  <AppText variant="bodySmall">{sub.name}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
          <AppText variant="h3" style={styles.sectionTitle}>
            Featured
          </AppText>
        </View>
      }
      data={services}
      keyExtractor={(item) => item._id || item.slug || item.productName || Math.random().toString()}
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          onPress={() =>
            navigation.navigate('ServiceDetail', {
              verticalSlug: DEFAULT_SERVICE_VERTICAL_SLUG,
              subSlug: item.SubCategory?.slug || subcategories[0]?.slug || '',
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
    gap: spacing.md,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  subNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  subChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    marginTop: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  loader: {
    marginVertical: spacing.lg,
  },
});
