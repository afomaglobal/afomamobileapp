import { StyleSheet, View } from 'react-native';

import { ProductCard } from '../../../components/ecommerce/ProductCard';
import { SectionHeader } from '../../../components/ecommerce/SectionHeader';
import { spacing } from '../../../design-system';
import type { Product } from '../../../services/types/product';

export const SHOP_SERVICES_PREVIEW_MAX = 2;

interface ShopServicesPreviewProps {
  services: Product[];
  totalCount: number;
  onServicePress: (service: Product) => void;
  onViewAll: () => void;
}

export function ShopServicesPreview({
  services,
  totalCount,
  onServicePress,
  onViewAll,
}: ShopServicesPreviewProps) {
  const preview = services.slice(0, SHOP_SERVICES_PREVIEW_MAX);
  if (preview.length === 0) {
    return null;
  }

  const showViewAll = totalCount > preview.length;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Bookable services"
        subtitle={
          totalCount === 1
            ? '1 service from this shop'
            : `${totalCount} services from this shop`
        }
        actionLabel={showViewAll ? 'View all' : undefined}
        onActionPress={showViewAll ? onViewAll : undefined}
        inset
      />

      <View style={styles.row}>
        {preview.map((service) => (
          <View key={service._id ?? service.slug} style={styles.cardWrap}>
            <ProductCard
              product={service}
              onPress={onServicePress}
              variant="elevated"
              layout="shop"
              showSeller={false}
              showWishlist={false}
            />
          </View>
        ))}
        {preview.length === 1 ? <View style={styles.cardSpacer} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cardWrap: {
    flex: 1,
  },
  cardSpacer: {
    flex: 1,
  },
});
