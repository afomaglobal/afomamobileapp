import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import { CheckoutSurfaceCard } from '../../checkout/components/CheckoutSurfaceCard';
import type {
  CheckoutShippingOption,
  SellerShippingOptionsGroup,
} from '../../checkout/hooks/useCheckoutShippingRates';
import type { ShippingAddress } from '../../checkout/types/shippingAddress';
import {
  getShippingMethodTitle,
  shouldShowShippingMethodPrice,
} from '../../checkout/utils/formatShippingOption';
import { formatProductPrice } from '../../products/utils/productDisplay';

export interface CartShippingDetailsCardProps {
  isAuthenticated: boolean;
  isLoadingAuthAddress?: boolean;
  needsDeliveryDetails: boolean;
  canFetchRates: boolean;
  isLoading: boolean;
  isRefreshingRates?: boolean;
  error: string | null;
  shippingAddress: ShippingAddress;
  groups: SellerShippingOptionsGroup[];
  selectedOptions: CheckoutShippingOption[];
  currency: string;
  onOpenDeliveryDetails: () => void;
  onOpenShippingOptions: () => void;
  onRetry: () => void;
}

function formatDeliverTo(address: ShippingAddress): string {
  const cityLine = [address.city.trim(), address.state.trim(), address.zip.trim()]
    .filter(Boolean)
    .join(', ');

  return [address.name.trim(), address.streetAddress.trim(), cityLine, address.country.trim()]
    .filter(Boolean)
    .join('\n');
}

function SelectedShippingMethodOption({
  option,
  currency,
}: {
  option: CheckoutShippingOption;
  currency: string;
}) {
  const methodTitle = getShippingMethodTitle(option.option);
  const showPrice = shouldShowShippingMethodPrice(option.option, option.rate);
  const priceLabel =
    option.rate <= 0 ? 'Free' : formatProductPrice(option.rate, currency);

  return (
    <View style={[styles.methodOption, styles.methodOptionSelected]}>
      <View style={[styles.radioOuter, styles.radioOuterSelected]}>
        <View style={styles.radioInner} />
      </View>
      <View style={[styles.methodCopy, !showPrice && styles.methodCopySingleLine]}>
        <AppText variant="bodySmall" style={styles.methodTitle} numberOfLines={2}>
          {methodTitle}
        </AppText>
        {showPrice ? (
          <AppText variant="caption" style={styles.methodPrice} numberOfLines={1}>
            {priceLabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** One plain, visible status line — replaces the old truck animation / header spinner. */
function ShippingStatusLine({ label }: { label: string }) {
  return (
    <View style={styles.statusLine} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="small" color={colors.primary} />
      <AppText variant="bodySmall" color="textSecondary" style={styles.statusText} numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

export function CartShippingDetailsCard({
  isAuthenticated,
  isLoadingAuthAddress = false,
  needsDeliveryDetails,
  canFetchRates,
  isLoading,
  isRefreshingRates = false,
  error,
  shippingAddress,
  groups,
  selectedOptions,
  currency,
  onOpenDeliveryDetails,
  onOpenShippingOptions,
  onRetry,
}: CartShippingDetailsCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoadingAuthAddress) {
    return (
      <CheckoutSurfaceCard style={styles.card}>
        <View style={styles.cardTitleLeft}>
          <Ionicons name="car-outline" size={20} color={colors.primary} />
          <AppText variant="bodyMedium" style={styles.cardTitle}>
            Shipping details
          </AppText>
        </View>
        <ShippingStatusLine label="Loading your delivery address…" />
      </CheckoutSurfaceCard>
    );
  }

  if (needsDeliveryDetails) {
    return (
      <CheckoutSurfaceCard style={styles.gateCard}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="car-outline" size={20} color={colors.primary} />
          <AppText variant="bodyMedium" style={styles.cardTitle}>
            Shipping details
          </AppText>
        </View>
        <AppText variant="bodySmall" color="textSecondary">
          {isAuthenticated
            ? 'Add a delivery address to calculate shipping.'
            : 'Add delivery details to calculate shipping.'}
        </AppText>
        {isAuthenticated ? (
          <AppButton label="Add delivery address" onPress={onOpenDeliveryDetails} />
        ) : null}
      </CheckoutSurfaceCard>
    );
  }

  const totalOptionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
  const hasLoadedMethods = groups.length > 0 || selectedOptions.length > 0;
  const showInitialMethodLoading = isLoading && !hasLoadedMethods;
  const canChangeMethod = !error && totalOptionCount > 0 && !isLoading;
  const isFetching = isLoading || isRefreshingRates;
  const destination = shippingAddress.city.trim() || shippingAddress.zip.trim();
  const fetchingLabel = hasLoadedMethods
    ? 'Updating shipping rates…'
    : destination
      ? `Getting carrier rates for ${destination}…`
      : 'Getting carrier rates…';
  const selectedShippingTotal = selectedOptions.reduce((sum, option) => sum + option.rate, 0);
  const collapsedSummary =
    !isFetching && !error && selectedOptions.length > 0
      ? selectedShippingTotal <= 0
        ? 'Free'
        : formatProductPrice(selectedShippingTotal, currency)
      : null;

  return (
    <CheckoutSurfaceCard style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.cardTitleRow, pressed && styles.pressed]}
      >
        <View style={styles.cardTitleLeft}>
          <Ionicons name="car-outline" size={20} color={colors.primary} />
          <AppText variant="bodyMedium" style={styles.cardTitle}>
            Shipping details
          </AppText>
        </View>
        <View style={styles.cardTitleRight}>
          {!expanded && collapsedSummary ? (
            <AppText variant="bodyMedium" style={styles.collapsedSummary}>
              {collapsedSummary}
            </AppText>
          ) : null}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {isFetching ? <ShippingStatusLine label={fetchingLabel} /> : null}

      {!expanded && !isFetching && error ? (
        <View style={styles.inlineState}>
          <AppText variant="bodySmall" color="error">
            {error}
          </AppText>
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <AppText variant="bodyMedium" color="textLink">
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="caption" style={styles.sectionLabel}>
                DELIVER TO
              </AppText>
              <Pressable accessibilityRole="button" onPress={onOpenDeliveryDetails} hitSlop={8}>
                <AppText variant="caption" color="textLink" style={styles.changeLink}>
                  Change
                </AppText>
              </Pressable>
            </View>
            <View style={styles.addressBox}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <AppText variant="bodySmall" style={styles.addressText}>
                {formatDeliverTo(shippingAddress)}
              </AppText>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="caption" style={styles.sectionLabel}>
                METHOD
              </AppText>
              {canChangeMethod ? (
                <Pressable accessibilityRole="button" onPress={onOpenShippingOptions} hitSlop={8}>
                  <AppText variant="caption" color="textLink" style={styles.changeLink}>
                    Change
                  </AppText>
                </Pressable>
              ) : null}
            </View>

            {showInitialMethodLoading ? null : error ? (
              <View style={styles.inlineState}>
                <AppText variant="bodySmall" color="error">
                  {error}
                </AppText>
                <Pressable accessibilityRole="button" onPress={onRetry}>
                  <AppText variant="bodyMedium" color="textLink">
                    Try again
                  </AppText>
                </Pressable>
              </View>
            ) : selectedOptions.length > 0 ? (
              <View style={[styles.methodList, isFetching && styles.stale]}>
                {selectedOptions.map((option) => (
                  <SelectedShippingMethodOption
                    key={option.id}
                    option={option}
                    currency={currency}
                  />
                ))}
              </View>
            ) : totalOptionCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={onOpenShippingOptions}>
                <AppText variant="bodySmall" color="textLink" style={styles.selectMethodLink}>
                  Select a shipping method
                </AppText>
              </Pressable>
            ) : (
              <AppText variant="bodySmall" color="textSecondary">
                No shipping options available for this address.
              </AppText>
            )}
          </View>
        </View>
      ) : null}
    </CheckoutSurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
  },
  statusText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  collapsedSummary: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stale: {
    opacity: 0.5,
  },
  gateCard: {
    gap: spacing.md,
  },
  gateActions: {
    gap: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    letterSpacing: 0.6,
    fontWeight: '700',
    color: colors.textMuted,
  },
  changeLink: {
    fontWeight: '700',
  },
  selectMethodLink: {
    fontWeight: '600',
  },
  addressBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  addressText: {
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  methodList: {
    gap: spacing.sm,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  methodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  methodCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    justifyContent: 'center',
  },
  methodCopySingleLine: {
    minHeight: 20,
  },
  methodTitle: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  methodPrice: {
    fontWeight: '700',
    color: colors.primary,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  inlineState: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
});
