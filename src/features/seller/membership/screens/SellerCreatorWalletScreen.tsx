import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../../design-system';
import { fetchCreatorWallet } from '../api/sellerMembershipApi';
import type { CreatorWalletSummary } from '../types/sellerMembership';
import { formatWalletBalance, formatWalletTransactionAmount } from '../utils/membershipDisplay';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerCreatorWallet'>;

export function SellerCreatorWalletScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { sellerId } = route.params;
  const [wallet, setWallet] = useState<CreatorWalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setWallet(await fetchCreatorWallet(sellerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    }
  }, [sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <AppText variant="h2" style={styles.title}>
        My Wallet
      </AppText>
      <AppText variant="bodySmall" color="textSecondary" style={styles.intro}>
        Milestone credits from your seller plan. Credits can cover Test Drive listing fees and reduce
        subscription payments.
      </AppText>

      {error ? (
        <AppText variant="bodySmall" color="error">
          {error}
        </AppText>
      ) : null}

      {wallet ? (
        <>
          <View style={styles.balanceCard}>
            <AppText variant="label" color="textSecondary">
              Available credits
            </AppText>
            <AppText variant="h2">
              {formatWalletBalance(wallet)}
            </AppText>
          </View>

          <View style={styles.activityCard}>
            <AppText variant="label" style={styles.sectionTitle}>
              Recent activity
            </AppText>
            {(wallet.transactions ?? []).length === 0 ? (
              <AppText variant="bodySmall" color="textSecondary">
                Milestone credits and redemptions will appear here.
              </AppText>
            ) : (
              (wallet.transactions ?? []).map((tx) => (
                <View key={tx._id} style={styles.txRow}>
                  <View style={styles.txCopy}>
                    <AppText variant="body">{tx.description || tx.source}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {new Date(tx.createdAt).toLocaleString()}
                    </AppText>
                  </View>
                  <AppText variant="label" style={tx.type === 'credit' ? styles.credit : styles.debit}>
                    {tx.type === 'credit' ? '+' : '-'}
                    {formatWalletTransactionAmount(tx)}
                  </AppText>
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  intro: {
    marginBottom: spacing.lg,
  },
  balanceCard: {
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  activityCard: {
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    ...shadows.card,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txCopy: {
    flex: 1,
    gap: 2,
  },
  credit: {
    color: colors.success,
  },
  debit: {
    color: colors.warningText,
  },
});
