import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorState } from '../../../components/ecommerce/ErrorState';
import { colors } from '../../../design-system';
import type { SellerStackParamList } from '../../../app/navigation/sellerTypes';
import { useAuth } from '../../auth/hooks/useAuth';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { useRequireSeller } from '../hooks/useRequireSeller';
import { useServiceProductWizard } from '../../services/hooks/useServiceProductWizard';
import { ServiceProductForm } from '../../services/components/ServiceProductForm';
import { consumeAdminProductAiPrefill } from '../../admin/product-management/state/adminProductAiPrefill';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerServiceProduct'>;

const RETURN_TO = authReturnTo.sellerProducts();

export function SellerServiceProductScreen({ navigation, route }: Props) {
  const productId = route.params?.productId;
  const { isAuthorized, sellerId } = useRequireSeller(RETURN_TO);
  const { user } = useAuth();
  const wizard = useServiceProductWizard(sellerId, productId, user?.accessToken);

  useFocusEffect(
    useCallback(() => {
      const prefill = consumeAdminProductAiPrefill('Service');
      if (prefill) {
        wizard.applyAiPrefill(prefill);
      }
    }, [wizard.applyAiPrefill]),
  );

  if (!isAuthorized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (wizard.isLoadingProduct) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (wizard.loadProductError) {
    return (
      <View style={styles.centered}>
        <ErrorState message={wizard.loadProductError} onAction={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <ServiceProductForm
      wizard={wizard}
      isEditMode={Boolean(productId)}
      navigation={navigation}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
