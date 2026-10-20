import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import type { CartLineItem } from '../../../services/types/cart';
import { formatServiceAppointmentSummary } from '../utils/serviceCartLine';

export function ServiceAppointmentDetails({ line }: { line: CartLineItem }) {
  const summary = formatServiceAppointmentSummary(line);
  const bd = line.bookingDetails;
  if (!summary && !bd?.startsAt) {
    return null;
  }

  return (
    <View style={styles.box}>
      <AppText variant="label">Appointment</AppText>
      {summary ? (
        <AppText variant="bodySmall" color="textSecondary">
          {summary}
        </AppText>
      ) : null}
      {bd?.addOns?.length ? (
        <AppText variant="caption" color="textMuted">
          Add-ons: {bd.addOns.map((a) => a.name).filter(Boolean).join(', ')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
    gap: spacing.xs,
  },
});
