import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../../design-system';
import { useSellerMembership } from '../hooks/useSellerMembership';
import {
  formatCommissionPercent,
  formatSellerPlanStatusLabel,
  getSellerPlanStatusTone,
  type SubscriptionStatusTone,
} from '../utils/membershipDisplay';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerMembership'>;

const STATUS_BADGE_STYLE: Record<SubscriptionStatusTone, { bg: string; text: string }> = {
  success: { bg: colors.success, text: colors.textInverse },
  warning: { bg: colors.warning, text: colors.textInverse },
  danger: { bg: colors.error, text: colors.textInverse },
  muted: { bg: colors.textSecondary, text: colors.textInverse },
};

function formatDate(value?: string | null, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return withTime
    ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Read-only "Subscription & Plan" screen for the mobile apps.
 *
 * Plans are chosen and paid for on the AFOMA website only. To comply with App Store
 * guideline 3.1.1 and Google Play's payments policy, this screen shows the seller's current
 * plan and status but no plan list, prices, purchase buttons, links or "upgrade" wording.
 */
export function SellerPlanStatusScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { sellerId } = route.params;
  const { membership, isLoading, error, reload } = useSellerMembership(sellerId);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const tone = membership ? getSellerPlanStatusTone(membership) : 'muted';
  const palette = STATUS_BADGE_STYLE[tone];
  const quota =
    membership?.maxActiveProducts != null
      ? `${membership.activeProductCount} / ${membership.maxActiveProducts}`
      : membership
        ? `${membership.activeProductCount}`
        : '—';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      {error ? (
        <AppText variant="bodySmall" color="error">
          {error}
        </AppText>
      ) : null}

      {!membership && isLoading ? (
        <AppText variant="bodySmall" color="textSecondary">
          Loading your plan…
        </AppText>
      ) : null}

      {membership ? (
        <>
          {membership.sellingPaused ? (
            <View style={[styles.notice, styles.noticeDanger]}>
              <Ionicons name="pause-circle-outline" size={20} color={colors.error} />
              <View style={styles.noticeText}>
                <AppText variant="label">Selling is paused on your account</AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  Your listings are currently hidden from buyers. Your products, orders, messages and
                  earnings are still available.
                </AppText>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
                <AppText variant="caption" style={{ color: palette.text }}>
                  {formatSellerPlanStatusLabel(membership)}
                </AppText>
              </View>
              <View style={styles.iconWrap}>
                <Ionicons name="storefront-outline" size={22} color={colors.primary} />
              </View>
            </View>

            <AppText variant="h2" style={styles.planName}>
              {membership.isOnTrial ? 'Free trial' : membership.tierName}
            </AppText>
            <AppText variant="bodySmall" color="textSecondary">
              {formatCommissionPercent(membership.commissionPercent)} commission rate
            </AppText>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <AppText variant="caption" color="textSecondary">
                  Active listings
                </AppText>
                <AppText variant="label">{quota}</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <AppText variant="caption" color="textSecondary">
                  {membership.isOnTrial ? 'Trial ends' : 'Renews'}
                </AppText>
                <AppText variant="label">
                  {membership.isOnTrial
                    ? formatDate(membership.trialEndsAt, true)
                    : membership.isSubscriptionActive
                      ? formatDate(membership.nextBillingDate)
                      : '—'}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <AppText variant="bodySmall" color="textSecondary" style={styles.infoText}>
              Plan changes aren&apos;t available in the app.
            </AppText>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.large,
    borderWidth: 1,
    padding: spacing.md,
  },
  noticeDanger: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
  },
  noticeText: {
    flex: 1,
    gap: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    color: colors.textPrimary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  infoText: {
    flex: 1,
  },
});
