import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppBadge } from '../../../components/ui/AppBadge';
import { shadows, spacing } from '../../../design-system';
import type { Product } from '../../../services/types/product';
import { isServiceProduct } from '../../services/utils/isServiceProduct';

export interface ListingTypeCornerBadgeProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

/** Compact overlay on listing images (home / category grids). */
export function ListingTypeCornerBadge({ product, style }: ListingTypeCornerBadgeProps) {
  if (!isServiceProduct(product)) {
    return null;
  }

  return (
    <View style={[styles.cornerBadge, style]} pointerEvents="none">
      <AppBadge label="Service" variant="primary" />
    </View>
  );
}

function getImageCaptionLabel(product: Product): string | null {
  if (isServiceProduct(product)) {
    const duration = product.serviceDetails?.durationMinutes;
    return duration ? `${duration} min` : null;
  }

  if (product.productType === 'Downloadable') {
    return 'Downloadable';
  }

  return null;
}

export interface ListingTypeImageCaptionProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

/**
 * Type hints on the image only — keeps card title/price blocks the same height in grids.
 */
export function ListingTypeImageCaption({ product, style }: ListingTypeImageCaptionProps) {
  const label = getImageCaptionLabel(product);
  if (!label) {
    return null;
  }

  const isDuration = isServiceProduct(product);

  return (
    <View style={[styles.imageCaption, style]} pointerEvents="none">
      <AppBadge
        label={label}
        variant={isDuration ? 'success' : 'primary'}
        style={styles.captionBadge}
      />
    </View>
  );
}

export interface ListingTypePillsProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

/** @deprecated Prefer ListingTypeImageCaption on listing cards. */
export function ListingTypePills({ product, style }: ListingTypePillsProps) {
  const label = getImageCaptionLabel(product);
  if (!label) {
    return null;
  }

  const isDuration = isServiceProduct(product);

  return (
    <View style={[styles.pills, style]}>
      <AppBadge label={label} variant={isDuration ? 'success' : 'primary'} />
    </View>
  );
}

export interface ListingTypeMetaRowProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

/** @deprecated No longer used on product cards — avoids uneven grid rows. */
export function ListingTypeMetaRow(_props: ListingTypeMetaRowProps) {
  return null;
}

const styles = StyleSheet.create({
  cornerBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
  },
  imageCaption: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    zIndex: 2,
    maxWidth: '85%',
  },
  captionBadge: {
    alignSelf: 'flex-start',
    ...shadows.card,
  },
  pills: {
    alignSelf: 'flex-start',
  },
});
