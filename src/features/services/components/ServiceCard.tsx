import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../design-system';
import type { Product } from '../../../services/types/product';
import { getProductDisplayName, getProductImageUrl } from '../../products/utils/productDisplay';
import { usePricing } from '../../../app/providers/PricingProvider';
import {
  formatServicePriceLabel,
  getServiceDisplayPricing,
} from '../utils/serviceDisplayPricing';

export interface ServiceCardProps {
  service: Product;
  onPress: () => void;
}

export function ServiceCard({ service, onPress }: ServiceCardProps) {
  const { userInfo } = usePricing();
  const pricing = getServiceDisplayPricing(service, userInfo);
  const imageUrl = getProductImageUrl(service);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <View style={styles.body}>
        <AppText variant="bodyMedium" numberOfLines={2}>
          {getProductDisplayName(service)}
        </AppText>
        <AppText variant="bodySmall" color="textMuted" numberOfLines={1}>
          {service.seller?.storeTitle || 'Independent provider'}
        </AppText>
        <AppText variant="bodyMedium" style={styles.price}>
          {formatServicePriceLabel(pricing.currencyLabel, pricing.displayPrice, {
            prefix: pricing.pricePrefix,
          })}
        </AppText>
        <AppText variant="caption" color="textLink">
          Book appointment
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.medium,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  price: {
    marginTop: spacing.xs,
  },
});
