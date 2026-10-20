import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../../design-system';
import type { MembershipPlanTier, MembershipPlansResponse } from '../types/sellerMembership';
import type { SellerBillingCycle, SellerMembershipTierId } from '../types/sellerMembership';
import {
  formatCommissionPercent,
  formatMembershipMoney,
  formatMilestoneCredit,
} from '../utils/membershipDisplay';

export interface MembershipTierPickerCardProps {
  tier: MembershipPlanTier;
  billingCycle: SellerBillingCycle;
  expanded: boolean;
  isCurrentPlan: boolean;
  isSelected: boolean;
  recommended?: boolean;
  plans?: MembershipPlansResponse | null;
  onSelect: (tierId: SellerMembershipTierId) => void;
}

function tierSummaryLine(tier: MembershipPlanTier): string {
  const parts = [`${formatCommissionPercent(tier.commissionPercent)} commission`];
  if (tier.maxActiveProducts != null) {
    parts.push(`Up to ${tier.maxActiveProducts} products`);
  } else {
    parts.push('Unlimited products');
  }
  return parts.join(' · ');
}

function TierFeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      <AppText variant="bodySmall" style={styles.featureText}>
        {label}
      </AppText>
    </View>
  );
}

export function MembershipTierPickerCard({
  tier,
  billingCycle,
  expanded,
  isCurrentPlan,
  isSelected,
  recommended,
  plans,
  onSelect,
}: MembershipTierPickerCardProps) {
  const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  const quote = tier.subscription[cycle];
  const priceLabel = quote.amountLocal <= 0
    ? 'Free'
    : `${formatMembershipMoney(quote.amountLocal, quote.currency)} / ${cycle === 'annual' ? 'year' : 'month'}`;

  if (!expanded) {
    return (
      <View style={styles.compactCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(tier.id)}
          style={styles.compactCopy}
        >
          <View style={styles.compactTitleRow}>
            <AppText variant="label" style={styles.tierName}>
              {tier.name}
            </AppText>
            {isCurrentPlan ? (
              <View style={styles.currentBadge}>
                <AppText variant="caption" style={styles.currentBadgeText}>
                  Current
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="bodySmall" color="textSecondary">
            {priceLabel}
          </AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {tierSummaryLine(tier)}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(tier.id)}
          style={styles.compareButton}
        >
          <AppText variant="caption" style={styles.compareButtonText}>
            Compare
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(tier.id)}
      style={[styles.expandedCard, isSelected && styles.expandedCardSelected]}
    >
      <View style={styles.badgeRow}>
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <AppText variant="caption" style={styles.selectedBadgeText}>
              Selected
            </AppText>
          </View>
        ) : null}
        {isCurrentPlan ? (
          <View style={styles.currentBadge}>
            <AppText variant="caption" style={styles.currentBadgeText}>
              Current plan
            </AppText>
          </View>
        ) : null}
        {recommended ? (
          <View style={styles.recommendedBadge}>
            <AppText variant="caption" style={styles.recommendedBadgeText}>
              Recommended
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="h3" style={styles.price}>
        {priceLabel}
      </AppText>

      <View style={styles.featureList}>
        <TierFeatureRow label={`${formatCommissionPercent(tier.commissionPercent)} commission rate`} />
        {tier.maxActiveProducts != null ? (
          <TierFeatureRow label={`Up to ${tier.maxActiveProducts} active products`} />
        ) : (
          <TierFeatureRow label="Unlimited active products" />
        )}
        {tier.listingFee ? (
          <TierFeatureRow
            label={`Listing fee ${formatMembershipMoney(tier.listingFee.amountLocal, tier.listingFee.currency)} per item`}
          />
        ) : tier.monthlyNewListingAllowance != null ? (
          <TierFeatureRow label={`${tier.monthlyNewListingAllowance} free listings per month`} />
        ) : (
          <TierFeatureRow label="Unlimited free listings" />
        )}
        {tier.milestoneCredits.sales10 > 0 ? (
          <TierFeatureRow
            label={`10-sale bonus: up to ${formatMilestoneCredit(tier.milestoneCredits.sales10, plans)} credits`}
          />
        ) : tier.milestoneHeroSlot ? (
          <TierFeatureRow label="10-sale bonus: homepage hero slot" />
        ) : null}
        {tier.features?.ai ? <TierFeatureRow label={tier.features.ai} /> : null}
        {tier.features?.visibility ? <TierFeatureRow label={tier.features.visibility} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.large,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  compactCopy: {
    flex: 1,
    gap: 2,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  compareButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  compareButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  expandedCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  expandedCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectedBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    color: colors.textInverse,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 10,
  },
  currentBadge: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  currentBadgeText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
  },
  recommendedBadge: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  recommendedBadgeText: {
    color: colors.warningText,
    fontWeight: '600',
    fontSize: 10,
  },
  tierName: {
    color: colors.textPrimary,
  },
  price: {
    color: colors.textPrimary,
  },
  featureList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
