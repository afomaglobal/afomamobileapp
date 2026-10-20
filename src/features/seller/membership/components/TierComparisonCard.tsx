import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../../design-system';
import type { MembershipPlanTier, MembershipPlansResponse } from '../types/sellerMembership';
import type { SellerBillingCycle, SellerMembershipTierId } from '../types/sellerMembership';
import {
  formatCommissionPercent,
  formatMembershipMoney,
  formatMilestoneCredit,
  getBillingCycleLabel,
} from '../utils/membershipDisplay';

export interface TierComparisonCardProps {
  tier: MembershipPlanTier;
  billingCycle: SellerBillingCycle;
  selected: boolean;
  onSelect: (tierId: SellerMembershipTierId) => void;
  plans?: MembershipPlansResponse | null;
}

export function TierComparisonCard({
  tier,
  billingCycle,
  selected,
  onSelect,
  plans,
}: TierComparisonCardProps) {
  const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
  const subscriptionPrice = tier.subscription[cycle];
  const isFree = subscriptionPrice.amountLocal <= 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect(tier.id)}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.headerRow}>
        <AppText variant="label" style={styles.title}>
          {tier.name}
        </AppText>
        {selected ? (
          <View style={styles.selectedBadge}>
            <AppText variant="caption" style={styles.selectedBadgeText}>
              Selected
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="h3" style={styles.price}>
        {isFree
          ? 'Free'
          : `${formatMembershipMoney(subscriptionPrice.amountLocal, subscriptionPrice.currency)} / ${cycle === 'annual' ? 'year' : 'month'}`}
      </AppText>

      <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
        Commission: {formatCommissionPercent(tier.commissionPercent)}
      </AppText>

      {tier.maxActiveProducts != null ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          Up to {tier.maxActiveProducts} active products
        </AppText>
      ) : (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          Unlimited products
        </AppText>
      )}

      {tier.listingFee ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          Listing fee: {formatMembershipMoney(tier.listingFee.amountLocal, tier.listingFee.currency)}{' '}
          per item (renewed quarterly)
        </AppText>
      ) : tier.monthlyNewListingAllowance != null ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          Free listings: up to {tier.monthlyNewListingAllowance}/month
        </AppText>
      ) : (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          Free unlimited listings
        </AppText>
      )}

      {tier.milestoneCredits.sales10 > 0 ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          10-sale bonus: up to {formatMilestoneCredit(tier.milestoneCredits.sales10, plans)} credits
        </AppText>
      ) : tier.milestoneHeroSlot ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.line}>
          10-sale bonus: homepage hero feature slot
        </AppText>
      ) : null}

      <AppText variant="caption" color="textSecondary" style={styles.cycleHint}>
        Billed {getBillingCycleLabel(cycle).toLowerCase()}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
  },
  selectedBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  price: {
    color: colors.textPrimary,
  },
  line: {
    lineHeight: 20,
  },
  cycleHint: {
    marginTop: spacing.xs,
  },
});
