import { Alert, StyleSheet, View } from 'react-native';

import { SelectField } from '../../../../components/forms';
import { AppText } from '../../../../components/ui/AppText';
import { spacing } from '../../../../design-system';
import { OrderDetailCollapsibleSection } from '../../../orders/components/OrderDetailCollapsibleSection';
import type { SellerOrderDetail } from '../types/sellerOrder';
import { formatSellerOrderStatus } from '../utils/sellerOrderMappers';
import {
  buildSellerServiceOrderStatusOptions,
  canUpdateSellerServiceOrderStatus,
  isDestructiveSellerServiceOrderStatus,
} from '../utils/sellerServiceOrder';

interface SellerServiceOrderStatusSectionProps {
  order: SellerOrderDetail;
  isUpdating?: boolean;
  onStatusChange: (status: string) => void;
}

export function SellerServiceOrderStatusSection({
  order,
  isUpdating,
  onStatusChange,
}: SellerServiceOrderStatusSectionProps) {
  const currentStatus = order.status?.trim() || 'Pending';
  const canUpdate = canUpdateSellerServiceOrderStatus(currentStatus);
  const options = buildSellerServiceOrderStatusOptions(currentStatus);

  const handleChange = (nextStatus: string) => {
    if (!nextStatus || nextStatus === currentStatus) {
      return;
    }

    const applyStatus = () => {
      onStatusChange(nextStatus);
    };

    if (isDestructiveSellerServiceOrderStatus(nextStatus)) {
      Alert.alert(
        'Cancel this service order?',
        'The appointment will be marked as cancelled.',
        [
          { text: 'Keep order', style: 'cancel' },
          { text: 'Cancel order', style: 'destructive', onPress: applyStatus },
        ],
      );
      return;
    }

    applyStatus();
  };

  return (
    <OrderDetailCollapsibleSection
      title="Service order status"
      icon="calendar-outline"
      collapsedPreview={
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {formatSellerOrderStatus(currentStatus)}
        </AppText>
      }
    >
      <View style={styles.body}>
        <AppText variant="bodySmall" color="textSecondary">
          Pending → Confirmed → Completed. You can cancel while the order is still pending.
        </AppText>
        <SelectField
          value={currentStatus}
          options={options}
          onChange={handleChange}
          disabled={!canUpdate || isUpdating}
          modalTitle="Update service order status"
        />
        {!canUpdate ? (
          <AppText variant="caption" color="textMuted">
            No further status changes are available for this order.
          </AppText>
        ) : null}
      </View>
    </OrderDetailCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
  },
});
