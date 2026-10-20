import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import { AppButton } from '../../../../components/ui/AppButton';
import { AppText } from '../../../../components/ui/AppText';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { colors, radius, shadows, spacing } from '../../../../design-system';
import { getErrorMessage } from '../../../../services/api/errors';
import { useAuth } from '../../../auth/hooks/useAuth';
import {
  cancelPendingBillingCycleChange,
  cancelSellerMembership,
  reactivateSellerMembership,
  scheduleBillingCycleChange,
  updateWalletSubscriptionPreference,
} from '../api/sellerMembershipApi';
import { MembershipTierPickerCard } from '../components/MembershipTierPickerCard';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import { useSellerMembership } from '../hooks/useSellerMembership';
import type { SellerBillingCycle, SellerMembershipTierId } from '../types/sellerMembership';
import {
  buildDowngradeConfirmMessage,
  formatCommissionPercent,
  formatMembershipMoney,
  formatSubscriptionStatus,
  formatWalletBalance,
  getBillingCycleLabel,
  getMembershipTierLabel,
  getSubscriptionStatusTone,
  resolveDowngradeOptions,
  type SubscriptionStatusTone,
} from '../utils/membershipDisplay';

const STATUS_BADGE_STYLE: Record<SubscriptionStatusTone, { bg: string; text: string }> = {
  success: { bg: colors.success, text: colors.textInverse },
  warning: { bg: colors.warning, text: colors.textInverse },
  danger: { bg: colors.error, text: colors.textInverse },
  muted: { bg: colors.textSecondary, text: colors.textInverse },
};

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerMembership'>;

function StatusPill({ tone, label }: { tone: SubscriptionStatusTone; label: string }) {
  const palette = STATUS_BADGE_STYLE[tone];
  return (
    <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
      <AppText variant="caption" style={[styles.statusPillText, { color: palette.text }]}>
        {label}
      </AppText>
    </View>
  );
}

export function SellerMembershipScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { sellerId } = route.params;
  const { user } = useAuth();
  const { membership, isLoading, error, reload } = useSellerMembership(sellerId);
  const { data: plans } = useMembershipPlans(
    user?.country || user?.countryName || user?.Country,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<SellerMembershipTierId | null>(
    null,
  );
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<SellerBillingCycle>('monthly');
  const [downgradeSheetVisible, setDowngradeSheetVisible] = useState(false);
  const [downgradeTargetTier, setDowngradeTargetTier] = useState<SellerMembershipTierId | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    if (membership?.upgradeOptions?.length) {
      setSelectedUpgradeTier(membership.upgradeOptions[0]);
    } else if (membership?.membershipTier) {
      setSelectedUpgradeTier(membership.membershipTier);
    }
  }, [membership?.membershipTier, membership?.upgradeOptions]);

  const selectedPlan = useMemo(() => {
    if (!plans || !selectedUpgradeTier) return null;
    return plans.tiers.find((tier) => tier.id === selectedUpgradeTier) ?? null;
  }, [plans, selectedUpgradeTier]);

  const dueTodayLabel = useMemo(() => {
    if (!selectedPlan || selectedBillingCycle === 'none') return null;
    const quote = selectedPlan.subscription[selectedBillingCycle];
    return formatMembershipMoney(quote.amountLocal, quote.currency);
  }, [selectedBillingCycle, selectedPlan]);

  const annualSavePercent = useMemo(() => {
    if (!plans?.tiers?.length) return null;
    const tier = plans.tiers.find(
      (item) => item.id === (selectedUpgradeTier || membership?.membershipTier),
    );
    if (!tier) return null;
    const monthly = tier.subscription.monthly.amountLocal;
    const annual = tier.subscription.annual.amountLocal;
    if (monthly <= 0) return null;
    const yearlyFromMonthly = monthly * 12;
    if (yearlyFromMonthly <= annual) return null;
    return Math.round((1 - annual / yearlyFromMonthly) * 100);
  }, [membership?.membershipTier, plans, selectedUpgradeTier]);

  const annualPriceLabel = useMemo(() => {
    if (!plans || !membership) return null;
    const tier = plans.tiers.find((item) => item.id === membership.membershipTier);
    const quote = tier?.subscription?.annual;
    return quote ? formatMembershipMoney(quote.amountLocal, quote.currency) : null;
  }, [membership, plans]);

  const needsSubscriptionPayment = Boolean(
    membership?.requiresPayment && !membership?.isSubscriptionActive,
  );

  const subscriptionStatusLabel = useMemo(() => {
    if (!membership) return '';
    return formatSubscriptionStatus(membership.subscriptionStatus, {
      requiresPayment: membership.requiresPayment,
      isSubscriptionActive: membership.isSubscriptionActive,
      membershipTier: membership.membershipTier,
      billingCycle: membership.billingCycle,
    });
  }, [membership]);

  const subscriptionStatusTone = useMemo(() => {
    if (!membership) return 'muted' as SubscriptionStatusTone;
    return getSubscriptionStatusTone(membership.subscriptionStatus, {
      requiresPayment: membership.requiresPayment,
      isSubscriptionActive: membership.isSubscriptionActive,
      membershipTier: membership.membershipTier,
      billingCycle: membership.billingCycle,
    });
  }, [membership]);

  const productQuotaLabel = useMemo(() => {
    if (!membership) return '—';
    if (membership.maxActiveProducts != null) {
      return `${membership.activeProductCount} / ${membership.maxActiveProducts}`;
    }
    return `${membership.activeProductCount} / unlimited`;
  }, [membership]);

  const canCheckoutUpgrade = Boolean(
    selectedUpgradeTier &&
      membership?.upgradeOptions?.includes(selectedUpgradeTier) &&
      !needsSubscriptionPayment,
  );

  const downgradeOptions = useMemo(
    () => resolveDowngradeOptions(membership),
    [membership],
  );

  const closeDowngradeSheet = useCallback(() => {
    setDowngradeSheetVisible(false);
    setDowngradeTargetTier(null);
  }, []);

  const submitDowngrade = useCallback(
    async (targetTier: SellerMembershipTierId) => {
      setActionLoading(true);
      try {
        await cancelSellerMembership({ sellerId, targetTier });
        closeDowngradeSheet();
        await reload();
      } catch (err) {
        Alert.alert(
          'Could not schedule downgrade',
          getErrorMessage(err, 'Something went wrong.'),
        );
      } finally {
        setActionLoading(false);
      }
    },
    [closeDowngradeSheet, reload, sellerId],
  );

  const handleDowngradeMembership = useCallback(() => {
    if (downgradeOptions.length === 0) {
      Alert.alert(
        'Downgrade unavailable',
        'Your current plan cannot be downgraded right now.',
      );
      return;
    }

    if (downgradeOptions.length === 1) {
      setDowngradeTargetTier(downgradeOptions[0]);
    } else {
      setDowngradeTargetTier(null);
    }
    setDowngradeSheetVisible(true);
  }, [downgradeOptions]);

  const handleReactivateMembership = () => {
    void (async () => {
      setActionLoading(true);
      try {
        await reactivateSellerMembership(sellerId);
        await reload();
      } catch (err) {
        Alert.alert(
          'Could not reactivate',
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        setActionLoading(false);
      }
    })();
  };

  const handleUpgrade = () => {
    if (!selectedUpgradeTier || selectedBillingCycle === 'none' || !canCheckoutUpgrade) return;

    navigation.navigate('SellerMembershipCheckout', {
      sellerId,
      membershipTier: selectedUpgradeTier,
      billingCycle: selectedBillingCycle,
      email: user?.email,
      mode: 'upgrade',
      wallet: membership?.wallet,
      walletBalanceCad: membership?.wallet.balanceCad ?? 0,
    });
  };

  const handleActivateSubscription = () => {
    if (!membership) return;
    navigation.navigate('SellerMembershipCheckout', {
      sellerId,
      membershipTier: membership.membershipTier,
      billingCycle: membership.billingCycle,
      email: user?.email,
      mode: 'activation',
      wallet: membership.wallet,
      walletBalanceCad: membership.wallet.balanceCad ?? 0,
    });
  };

  const handleRenewMembership = () => {
    if (!membership) return;
    navigation.navigate('SellerMembershipCheckout', {
      sellerId,
      membershipTier: membership.membershipTier,
      billingCycle: membership.billingCycle,
      email: user?.email,
      mode: 'renewal',
      wallet: membership.wallet,
      walletBalanceCad: membership.wallet.balanceCad ?? 0,
    });
  };

  const handleWalletPreferenceChange = (enabled: boolean) => {
    void (async () => {
      setActionLoading(true);
      try {
        await updateWalletSubscriptionPreference(sellerId, enabled);
        await reload();
      } catch (err) {
        Alert.alert(
          'Could not update preference',
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        setActionLoading(false);
      }
    })();
  };

  const handleScheduleAnnualBilling = () => {
    const effectiveDate = membership?.nextBillingDate
      ? new Date(membership.nextBillingDate).toLocaleDateString()
      : 'your next billing date';

    Alert.alert(
      'Switch to annual billing?',
      `You have already paid for this month. Your plan stays monthly until ${effectiveDate}. On that date you will be charged ${annualPriceLabel || 'the annual plan price'} for one year.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Schedule for next billing',
          onPress: () => {
            void (async () => {
              setActionLoading(true);
              try {
                await scheduleBillingCycleChange(sellerId, 'annual');
                await reload();
              } catch (err) {
                Alert.alert(
                  'Could not schedule billing change',
                  err instanceof Error ? err.message : 'Something went wrong.',
                );
              } finally {
                setActionLoading(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleCancelPendingAnnualBilling = () => {
    void (async () => {
      setActionLoading(true);
      try {
        await cancelPendingBillingCycleChange(sellerId);
        await reload();
      } catch (err) {
        Alert.alert(
          'Could not cancel billing change',
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      } finally {
        setActionLoading(false);
      }
    })();
  };

  return (
    <>
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

        {membership ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadges}>
                  <StatusPill tone={subscriptionStatusTone} label={subscriptionStatusLabel} />
                  {membership.billingCycle !== 'none' ? (
                    <AppText variant="caption" color="textSecondary">
                      Billed {getBillingCycleLabel(membership.billingCycle)}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="rocket-outline" size={22} color={colors.primary} />
                </View>
              </View>

              <AppText variant="h2" style={styles.heroPlanName}>
                {membership.tierName}
              </AppText>
              <AppText variant="bodySmall" color="textSecondary">
                {formatCommissionPercent(membership.commissionPercent)} commission rate
              </AppText>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <AppText variant="caption" color="textSecondary">
                    Active listings
                  </AppText>
                  <AppText variant="label">{productQuotaLabel}</AppText>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <AppText variant="caption" color="textSecondary">
                    Next renewal
                  </AppText>
                  <AppText variant="label">
                    {membership.nextBillingDate
                      ? new Date(membership.nextBillingDate).toLocaleDateString()
                      : '—'}
                  </AppText>
                </View>
              </View>

              <View style={styles.heroFooter}>
                <AppText variant="caption" color="textSecondary">
                  Shop status: {membership.status || '—'}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('SellerCreatorWallet', { sellerId })}
                  style={styles.historyLink}
                >
                  <AppText variant="caption" style={styles.linkText}>
                    History
                  </AppText>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            {needsSubscriptionPayment ? (
              <View style={styles.alertBannerWarning}>
                <AppText variant="bodySmall" style={styles.alertTextWarning}>
                  Complete payment to unlock product listing and paid plan benefits.
                </AppText>
                <AppButton
                  label="Complete payment"
                  onPress={handleActivateSubscription}
                  disabled={actionLoading}
                  style={styles.alertAction}
                />
              </View>
            ) : null}

            {membership.subscriptionStatus === 'past_due' ? (
              <View style={styles.alertBannerDanger}>
                <AppText variant="bodySmall" style={styles.alertTextDanger}>
                  Renewal is overdue. Pay the balance or use My Wallet credits.
                </AppText>
                <AppButton
                  label="Renew subscription"
                  onPress={handleRenewMembership}
                  disabled={actionLoading}
                  style={styles.alertAction}
                />
              </View>
            ) : null}

            {membership.subscriptionCancelAtPeriodEnd ? (
              <View style={styles.noticeCard}>
                <AppText variant="bodySmall" color="textSecondary">
                  Downgrade to {getMembershipTierLabel(membership.pendingMembershipTier, plans)} scheduled for
                  {membership.nextBillingDate
                    ? ` ${new Date(membership.nextBillingDate).toLocaleDateString()}`
                    : ' period end'}
                  .
                </AppText>
                {membership.canReactivate ? (
                  <AppButton
                    label={actionLoading ? 'Working…' : 'Keep my plan'}
                    variant="outline"
                    onPress={handleReactivateMembership}
                    disabled={actionLoading}
                    style={styles.blockTop}
                  />
                ) : null}
              </View>
            ) : null}

            {membership.pendingBillingCycle === 'annual' ? (
              <View style={styles.inlineNotice}>
                <AppText variant="bodySmall" color="textSecondary">
                  Annual billing scheduled
                  {membership.nextBillingDate
                    ? ` for ${new Date(membership.nextBillingDate).toLocaleDateString()}`
                    : ''}
                  {annualPriceLabel ? ` (${annualPriceLabel}/year)` : ''}.
                </AppText>
                {membership.canCancelPendingBillingCycle ? (
                  <Pressable onPress={handleCancelPendingAnnualBilling} disabled={actionLoading}>
                    <AppText variant="bodySmall" style={styles.linkText}>
                      Cancel scheduled switch
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : membership.canScheduleAnnualBilling ? (
              <View style={styles.inlineNotice}>
                <AppText variant="bodySmall" color="textSecondary">
                  Switch to annual at your next renewal and keep this month paid.
                </AppText>
                <AppButton
                  label="Switch to annual"
                  onPress={handleScheduleAnnualBilling}
                  disabled={actionLoading}
                  style={styles.blockTop}
                />
              </View>
            ) : null}

            {membership.isSubscriptionActive && membership.membershipTier !== 'test_drive' ? (
              <View style={styles.walletSection}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleTitleRow}>
                    <Ionicons name="sync-outline" size={18} color={colors.primary} />
                    <AppText variant="label" style={styles.toggleTitle}>
                      Auto-apply wallet credits
                    </AppText>
                  </View>
                  <Switch
                    value={membership.applyWalletToSubscription === true}
                    onValueChange={handleWalletPreferenceChange}
                    disabled={actionLoading}
                    trackColor={{ false: colors.border, true: colors.primarySoft }}
                    thumbColor={
                      membership.applyWalletToSubscription === true
                        ? colors.primary
                        : colors.surfaceMuted
                    }
                  />
                </View>
                <AppText variant="caption" color="textSecondary">
                  Deduct available My Wallet rewards from scheduled subscription billing.
                </AppText>
                <View style={styles.walletInfoBanner}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <AppText variant="caption" color="textSecondary" style={styles.walletInfoCopy}>
                    Balance: {formatWalletBalance(membership.wallet)}. Auto-deduct applies once
                    credits are earned.
                  </AppText>
                </View>
              </View>
            ) : null}

            {plans?.tiers?.length ? (
              <View style={styles.tiersSection}>
                <AppText variant="label" style={styles.sectionHeading}>
                  Available tiers
                </AppText>
                <AppText variant="bodySmall" color="textSecondary" style={styles.sectionSubheading}>
                  Compare plans and choose the tier that fits your growth.
                </AppText>

                <View style={styles.segmentedControl}>
                  {(['monthly', 'annual'] as const).map((cycle) => {
                    const active = selectedBillingCycle === cycle;
                    return (
                      <Pressable
                        key={cycle}
                        accessibilityRole="button"
                        onPress={() => setSelectedBillingCycle(cycle)}
                        style={[styles.segment, active && styles.segmentActive]}
                      >
                        <AppText
                          variant="bodySmall"
                          style={active ? styles.segmentTextActive : styles.segmentText}
                        >
                          {getBillingCycleLabel(cycle)}
                        </AppText>
                        {cycle === 'annual' && annualSavePercent ? (
                          <View style={styles.saveBadge}>
                            <AppText variant="caption" style={styles.saveBadgeText}>
                              Save {annualSavePercent}%
                            </AppText>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.tierList}>
                  {plans.tiers.map((tier) => {
                    const isCurrentPlan = tier.id === membership.membershipTier;
                    const isSelected = tier.id === selectedUpgradeTier;
                    const expanded = isSelected;
                    const recommended =
                      tier.id === 'pro_exporter' && membership.membershipTier !== 'pro_exporter';

                    return (
                      <MembershipTierPickerCard
                        key={tier.id}
                        tier={tier}
                        billingCycle={selectedBillingCycle}
                        expanded={expanded}
                        isCurrentPlan={isCurrentPlan}
                        isSelected={isSelected && !isCurrentPlan}
                        recommended={recommended && isSelected}
                        plans={plans}
                        onSelect={setSelectedUpgradeTier}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            {needsSubscriptionPayment && membership.upgradeOptions?.length ? (
              <AppText variant="bodySmall" color="textSecondary">
                Complete your current subscription payment before upgrading.
              </AppText>
            ) : null}

            {canCheckoutUpgrade && dueTodayLabel ? (
              <View style={styles.checkoutSection}>
                <View style={styles.dueTodayRow}>
                  <View>
                    <AppText variant="caption" color="textSecondary">
                      Due today
                    </AppText>
                    <AppText variant="h3" style={styles.dueTodayAmount}>
                      {dueTodayLabel}
                    </AppText>
                  </View>
                  <View style={styles.secureRow}>
                    <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
                    <AppText variant="caption" color="textSecondary">
                      Secure checkout
                    </AppText>
                  </View>
                </View>
                <AppButton
                  label="Continue to payment"
                  onPress={handleUpgrade}
                  disabled={!selectedUpgradeTier || actionLoading}
                  style={styles.checkoutButton}
                />
              </View>
            ) : null}

            {membership.canCancel ? (
              <AppButton
                label={actionLoading ? 'Working…' : 'Downgrade plan'}
                variant="outline"
                onPress={handleDowngradeMembership}
                disabled={actionLoading}
                style={styles.cancelButton}
              />
            ) : null}
          </>
        ) : isLoading ? (
          <AppText variant="bodySmall" color="textSecondary">
            Loading subscription details…
          </AppText>
        ) : null}
    </ScrollView>

      <BottomSheet
        visible={downgradeSheetVisible}
        onClose={() => {
          if (downgradeTargetTier && downgradeOptions.length > 1) {
            setDowngradeTargetTier(null);
            return;
          }
          closeDowngradeSheet();
        }}
        title={downgradeTargetTier ? 'Confirm downgrade' : 'Downgrade plan'}
        footer={
          downgradeTargetTier ? (
            <View style={styles.downgradeSheetFooter}>
              <AppButton
                label={actionLoading ? 'Working…' : 'Schedule downgrade'}
                onPress={() => {
                  if (downgradeTargetTier) {
                    void submitDowngrade(downgradeTargetTier);
                  }
                }}
                disabled={actionLoading}
                fullWidth
              />
              <AppButton
                label="Keep current plan"
                variant="outline"
                onPress={closeDowngradeSheet}
                disabled={actionLoading}
                fullWidth
              />
            </View>
          ) : undefined
        }
      >
        {downgradeTargetTier && membership ? (
          <AppText variant="bodySmall" color="textSecondary" style={styles.downgradeConfirmCopy}>
            {buildDowngradeConfirmMessage(downgradeTargetTier, membership, plans)}
          </AppText>
        ) : (
          <View style={styles.downgradeOptionList}>
            {downgradeOptions.map((tierId) => (
              <Pressable
                key={tierId}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.downgradeOptionRow,
                  pressed && styles.downgradeOptionRowPressed,
                ]}
                onPress={() => setDowngradeTargetTier(tierId)}
              >
                <View style={styles.downgradeOptionCopy}>
                  <AppText variant="body" style={styles.downgradeOptionTitle}>
                    {getMembershipTierLabel(tierId, plans)}
                  </AppText>
                  {membership ? (
                    <AppText variant="caption" color="textSecondary">
                      {buildDowngradeConfirmMessage(tierId, membership, plans)}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheet>
    </>
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlanName: {
    color: colors.textPrimary,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  heroStat: {
    flex: 1,
    gap: 2,
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusPillText: {
    fontWeight: '600',
  },
  alertBannerWarning: {
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.secondaryMuted,
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertTextWarning: {
    color: colors.warningText,
  },
  alertBannerDanger: {
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBg,
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertTextDanger: {
    color: colors.error,
  },
  alertAction: {
    alignSelf: 'flex-start',
  },
  noticeCard: {
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  inlineNotice: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  walletSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  toggleTitle: {
    color: colors.textPrimary,
  },
  walletInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  walletInfoCopy: {
    flex: 1,
    lineHeight: 18,
  },
  tiersSection: {
    gap: spacing.sm,
  },
  sectionHeading: {
    color: colors.textPrimary,
  },
  sectionSubheading: {
    marginBottom: spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  saveBadgeText: {
    color: colors.warningText,
    fontWeight: '600',
    fontSize: 10,
  },
  tierList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  blockTop: {
    marginTop: spacing.sm,
  },
  checkoutSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dueTodayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueTodayAmount: {
    color: colors.primary,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkoutButton: {
    marginTop: spacing.xs,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  downgradeSheetFooter: {
    gap: spacing.sm,
  },
  downgradeConfirmCopy: {
    lineHeight: 20,
  },
  downgradeOptionList: {
    gap: spacing.sm,
  },
  downgradeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  downgradeOptionRowPressed: {
    opacity: 0.85,
  },
  downgradeOptionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  downgradeOptionTitle: {
    fontWeight: '600',
  },
});
