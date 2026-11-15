import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../design-system';
import {
  useMarketplaceChromeOptional,
} from '../../../app/navigation/marketplaceChrome';
import { getMarketplaceFooterContentInset } from '../../../app/navigation/marketplaceChrome/marketplaceFooterLayout';
import { formatProductPrice } from '../../products/utils/productDisplay';

export interface CartSummarySheetProps {
  currency?: string;
  total?: number | null;
  shippingPending?: boolean;
  /** Carrier rates are being fetched — show a clear "Calculating…" state instead of a dash. */
  shippingCalculating?: boolean;
  checkoutDisabled?: boolean;
  onCheckout: () => void;
  showAuthGate?: boolean;
  authGateMessage?: string;
  onSignIn?: () => void;
  onContinueAsGuest?: () => void;
  style?: ViewStyle;
  hasFooterTabs?: boolean;
}

export function CartSummarySheet({
  currency = 'CAD',
  total = null,
  shippingPending = false,
  shippingCalculating = false,
  checkoutDisabled,
  onCheckout,
  showAuthGate = false,
  authGateMessage = 'Sign in or continue as guest to calculate shipping and pay.',
  onSignIn,
  onContinueAsGuest,
  style,
  hasFooterTabs = false,
}: CartSummarySheetProps) {
  const insets = useSafeAreaInsets();
  const chrome = useMarketplaceChromeOptional();
  const footerInset =
    chrome?.footerContentInset ?? getMarketplaceFooterContentInset(insets.bottom);
  const bottomPadding = hasFooterTabs ? footerInset + spacing.md : insets.bottom + spacing.md;

  const totalLabel =
    shippingPending || total == null ? '—' : formatProductPrice(total, currency);

  if (showAuthGate) {
    // Kept compact: a tall stacked gate on top of the floating tab bar left almost no room
    // for the cart list on smaller phones.
    return (
      <View style={[styles.sheet, styles.sheetCompact, { paddingBottom: bottomPadding }, style]}>
        <AppText
          variant="caption"
          color="textSecondary"
          style={styles.authGateCopy}
          numberOfLines={2}
        >
          {authGateMessage}
        </AppText>

        {/* Stacked: side by side, "Continue as guest" didn't fit on narrow phones. */}
        <View style={styles.authGateActions}>
          <AppButton
            label="Sign in"
            variant="outline"
            fullWidth
            shape="pill"
            onPress={onSignIn}
          />
          <AppButton
            label="Continue as guest"
            fullWidth
            shape="pill"
            onPress={onContinueAsGuest}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }, style]}>
      <View style={styles.totalBar}>
        <AppText variant="body" color="textSecondary">
          Total
        </AppText>
        {shippingCalculating ? (
          <View style={styles.calculatingRow} accessibilityLabel="Calculating total">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="bodyMedium" color="textSecondary">
              Calculating…
            </AppText>
          </View>
        ) : (
          <AppText
            variant="h2"
            style={[styles.totalValue, shippingPending && styles.totalPending]}
          >
            {totalLabel}
          </AppText>
        )}
      </View>

      <AppButton
        label="Continue to payment"
        fullWidth
        size="lg"
        shape="pill"
        variant="primary"
        disabled={checkoutDisabled}
        onPress={onCheckout}
      />

      <View style={styles.secureRow}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
        <AppText variant="caption" color="textMuted">
          Secure checkout
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    ...shadows.floating,
  },
  sheetCompact: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  authGateCopy: {
    textAlign: 'center',
  },
  authGateActions: {
    gap: spacing.sm,
  },
  calculatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 32,
  },
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalValue: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  totalPending: {
    color: colors.textMuted,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
