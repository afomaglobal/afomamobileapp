import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorState } from '../../../../components/ecommerce/ErrorState';
import { colors, spacing } from '../../../../design-system';
import type { AdminStackParamList } from '../../navigation/adminTypes';
import { useAuth } from '../../../auth/hooks/useAuth';
import { authReturnTo } from '../../../auth/utils/authNavigation';
import { useRequireAdmin } from '../../hooks/useRequireAdmin';
import { AdminSellerPickerField } from '../../product-management/components/AdminSellerPickerField';
import { useAdminSellerPicker } from '../../product-management/hooks/useAdminSellerPicker';
import { consumeAdminProductAiPrefill } from '../../product-management/state/adminProductAiPrefill';
import { useServiceProductWizard } from '../../../services/hooks/useServiceProductWizard';
import { ServiceProductForm } from '../../../services/components/ServiceProductForm';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminServiceProduct'>;

export function AdminServiceProductScreen({ route }: Props) {
  const { isAuthorized } = useRequireAdmin(authReturnTo.adminListingManagement());
  const { user } = useAuth();
  const productId = route.params?.productId;
  const routeSellerId = route.params?.sellerId?.trim();
  const isEditMode = Boolean(productId);
  const [sellerId, setSellerId] = useState(routeSellerId ?? '');
  const wizard = useServiceProductWizard(sellerId, productId, user?.accessToken, {
    requireSellerSelection: true,
  });
  const sellerPicker = useAdminSellerPicker(isAuthorized);

  useEffect(() => {
    if (routeSellerId) {
      setSellerId(routeSellerId);
    }
  }, [routeSellerId]);

  useEffect(() => {
    if (wizard.effectiveSellerId && isEditMode) {
      setSellerId(wizard.effectiveSellerId);
    }
  }, [isEditMode, wizard.effectiveSellerId]);

  useFocusEffect(
    useCallback(() => {
      const prefill = consumeAdminProductAiPrefill('Service');
      if (!prefill) {
        return;
      }
      if (prefill.sellerId && !isEditMode) {
        setSellerId(prefill.sellerId);
      }
      wizard.applyAiPrefill(prefill);
    }, [isEditMode, wizard.applyAiPrefill]),
  );

  const handleSellerChange = useCallback(
    (nextSellerId: string) => {
      setSellerId(nextSellerId);
      wizard.setFieldErrors((current) => {
        if (!current.sellerId) {
          return current;
        }
        const next = { ...current };
        delete next.sellerId;
        return next;
      });
    },
    [wizard],
  );

  if (!isAuthorized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (wizard.isLoadingProduct && isEditMode) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (wizard.loadProductError && isEditMode) {
    return (
      <View style={styles.centered}>
        <ErrorState message={wizard.loadProductError} />
      </View>
    );
  }

  const sellerPickerLocked = isEditMode && Boolean(wizard.effectiveSellerId);

  const beforeServiceNameContent = (
    <AdminSellerPickerField
      value={sellerId}
      options={sellerPicker.options}
      onChange={handleSellerChange}
      error={wizard.fieldErrors.sellerId}
      isLoading={sellerPicker.isLoading}
      loadError={sellerPicker.error}
      onRetry={() => void sellerPicker.reload()}
      disabled={sellerPickerLocked}
    />
  );

  return (
    <ServiceProductForm
      wizard={wizard}
      isEditMode={isEditMode}
      beforeServiceNameContent={beforeServiceNameContent}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});
