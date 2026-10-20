import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../../design-system';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import type { SellerBillingCycle, SellerMembershipTierId } from '../types/sellerMembership';
import { TierComparisonCard } from './TierComparisonCard';

export interface SellerRegistrationPlanPickerProps {
  country: string;
  membershipTier: SellerMembershipTierId;
  billingCycle: SellerBillingCycle;
  onTierChange: (tierId: SellerMembershipTierId) => void;
  onBillingCycleChange: (cycle: SellerBillingCycle) => void;
  disabled?: boolean;
}

export function SellerRegistrationPlanPicker({
  country,
  membershipTier,
  billingCycle,
  onTierChange,
  onBillingCycleChange,
  disabled,
}: SellerRegistrationPlanPickerProps) {
  const { data, isLoading, error } = useMembershipPlans(country || undefined);
  const tiers = data?.tiers ?? [];
  const effectiveBillingCycle: SellerBillingCycle =
    membershipTier === 'test_drive' ? 'none' : billingCycle;

  if (!country) {
    return (
      <View style={styles.section}>
        <AppText variant="label" style={styles.heading}>
          Choose your seller plan
        </AppText>
        <AppText variant="bodySmall" color="textSecondary">
          Select your country above to see membership plans priced for your region.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <AppText variant="label" style={styles.heading}>
        Choose your seller plan
      </AppText>
      <AppText variant="bodySmall" color="textSecondary" style={styles.subheading}>
        Start free on Test Drive or pick a paid plan for lower commission and more listings.
      </AppText>

      {membershipTier !== 'test_drive' ? (
        <View style={styles.cycleRow}>
          {(['monthly', 'annual'] as const).map((cycle) => {
            const active = billingCycle === cycle;
            return (
              <Pressable
                key={cycle}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => onBillingCycleChange(cycle)}
                style={[styles.cycleChip, active && styles.cycleChipActive]}
              >
                <AppText
                  variant="bodySmall"
                  style={active ? styles.cycleChipTextActive : undefined}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <AppText variant="bodySmall" color="error" style={styles.message}>
          {error}
        </AppText>
      ) : null}

      {isLoading ? (
        <AppText variant="bodySmall" color="textSecondary">
          Loading plans…
        </AppText>
      ) : (
        <View style={styles.tierList}>
          {tiers.map((tier) => (
            <TierComparisonCard
              key={tier.id}
              tier={tier}
              billingCycle={effectiveBillingCycle}
              selected={membershipTier === tier.id}
              plans={data}
              onSelect={(tierId) => {
                onTierChange(tierId);
                if (tierId === 'test_drive') {
                  onBillingCycleChange('none');
                } else if (billingCycle === 'none') {
                  onBillingCycleChange('monthly');
                }
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  heading: {
    marginBottom: spacing.xs,
  },
  subheading: {
    marginBottom: spacing.xs,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cycleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cycleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cycleChipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  tierList: {
    gap: spacing.md,
  },
  message: {
    marginBottom: spacing.xs,
  },
});
