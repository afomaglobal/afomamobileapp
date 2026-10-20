import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../../components/ui/AppButton';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../../design-system';
import { KorapayCheckoutWebView } from '../../../checkout/components/KorapayCheckoutWebView';
import type { ListingFeePaymentModalProps } from '../hooks/useListingFeePayment';
import { formatMembershipMoney } from '../utils/membershipDisplay';

export function ListingFeePaymentModal({
  visible,
  tierError,
  isProcessing,
  error,
  checkoutUrl,
  onPay,
  onCancel,
  onKorapayComplete,
  onKorapayCancel,
}: ListingFeePaymentModalProps) {
  const fee = tierError?.listingFee;
  const feeLabel = fee
    ? formatMembershipMoney(fee.amountLocal, fee.currency)
    : null;

  return (
    <>
      <Modal visible={visible && !checkoutUrl} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <AppText variant="h3">Listing fee required</AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.copy}>
              Your Test Drive plan charges a listing fee when you add a new product.
              {fee?.listingRenewalMonths
                ? ` This listing renews every ${fee.listingRenewalMonths} months.`
                : null}
            </AppText>

            {feeLabel ? (
              <View style={styles.amountBox}>
                <AppText variant="label" color="textSecondary">
                  Due now
                </AppText>
                <AppText variant="h2">{feeLabel}</AppText>
              </View>
            ) : null}

            {error ? (
              <AppText variant="bodySmall" color="error" style={styles.error}>
                {error}
              </AppText>
            ) : null}

            <AppButton
              label={isProcessing ? 'Processing…' : 'Pay listing fee'}
              fullWidth
              size="lg"
              shape="pill"
              onPress={onPay}
              disabled={isProcessing}
            />
            <Pressable accessibilityRole="button" onPress={onCancel} disabled={isProcessing}>
              <AppText variant="bodySmall" color="textSecondary" style={styles.cancel}>
                Cancel
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KorapayCheckoutWebView
        visible={Boolean(checkoutUrl)}
        checkoutUrl={checkoutUrl}
        onComplete={onKorapayComplete}
        onCancel={onKorapayCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.md,
  },
  copy: {
    lineHeight: 20,
  },
  amountBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.xs,
  },
  error: {
    marginTop: spacing.xs,
  },
  cancel: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
