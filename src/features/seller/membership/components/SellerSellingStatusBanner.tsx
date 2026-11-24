import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../../design-system';
import type { SellerMembershipSummary } from '../types/sellerMembership';

function formatTrialEnd(value?: string | null): string {
  if (!value) return 'soon';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'soon';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Neutral trial / paused notice for the seller dashboard. No prices, links, or
 * "upgrade"/"pay" wording: plans are managed on the website only (App Store 3.1.1).
 */
export function SellerSellingStatusBanner({
  membership,
}: {
  membership: Pick<
    SellerMembershipSummary,
    'isOnTrial' | 'trialEndsAt' | 'trialMaxActiveProducts' | 'sellingPaused'
  > | null;
}) {
  if (!membership) return null;

  if (membership.sellingPaused) {
    return (
      <View style={[styles.banner, styles.paused]}>
        <Ionicons name="pause-circle-outline" size={20} color={colors.error} />
        <View style={styles.text}>
          <AppText variant="label">Selling is paused on your account</AppText>
          <AppText variant="bodySmall" color="textSecondary">
            Your listings are hidden from buyers. Orders, messages and earnings are still available.
          </AppText>
        </View>
      </View>
    );
  }

  if (membership.isOnTrial) {
    return (
      <View style={[styles.banner, styles.trial]}>
        <Ionicons name="time-outline" size={20} color={colors.warningText} />
        <View style={styles.text}>
          <AppText variant="label">Onboarding ends {formatTrialEnd(membership.trialEndsAt)}</AppText>
          <AppText variant="bodySmall" color="textSecondary">
            You can have up to {membership.trialMaxActiveProducts ?? 5} active products during onboarding.
          </AppText>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.large,
    borderWidth: 1,
    padding: spacing.md,
  },
  paused: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
  },
  trial: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
