import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../../components/ui/AppText';
import { colors, spacing } from '../../../../design-system';
import type { AdminStackParamList } from '../../navigation/adminTypes';
import { authReturnTo } from '../../../auth/utils/authNavigation';
import { useRequireAdmin } from '../../hooks/useRequireAdmin';
import { SellerListingHubRow } from '../../../seller/listing/components/SellerListingHubRow';
import {
  navigateToAdminListingList,
  openAdminAddProductFlow,
  openAdminAddServiceFlow,
} from '../../product-management/utils/adminListingHubNavigation';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminListingManagement'>;

const LISTING_HUB_RETURN_TO = authReturnTo.adminListingManagement();

export function AdminListingManagementScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthorized } = useRequireAdmin(LISTING_HUB_RETURN_TO);
  const openProducts = useCallback(() => {
    navigateToAdminListingList(navigation, 'products');
  }, [navigation]);

  const openServices = useCallback(() => {
    navigateToAdminListingList(navigation, 'services');
  }, [navigation]);

  const handleAddProduct = useCallback(() => {
    openAdminAddProductFlow(navigation);
  }, [navigation]);

  const handleAddService = useCallback(() => {
    openAdminAddServiceFlow(navigation);
  }, [navigation]);

  const handleTeamsSettings = useCallback(() => {
    navigation.navigate('AdminServiceTeamsSettings');
  }, [navigation]);

  if (!isAuthorized) {
    return <View style={[styles.screen, { paddingTop: insets.top }]} />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="bodySmall" color="textSecondary" style={styles.lead}>
        Manage product and service listings across the platform, matching the web admin catalog.
      </AppText>

      <View style={styles.section}>
        <AppText variant="caption" style={styles.sectionLabel}>
          Products
        </AppText>
        <View style={styles.sectionCard}>
          <SellerListingHubRow
            icon="list-outline"
            label="Product listing"
            onPress={openProducts}
          />
          <SellerListingHubRow
            icon="add-circle-outline"
            label="Add product"
            onPress={handleAddProduct}
            isLast
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="caption" style={styles.sectionLabel}>
          Services
        </AppText>
        <View style={styles.sectionCard}>
          <SellerListingHubRow
            icon="list-outline"
            label="Service listing"
            onPress={openServices}
          />
          <SellerListingHubRow
            icon="add-circle-outline"
            label="Add service"
            onPress={handleAddService}
          />
          <SellerListingHubRow
            icon="settings-outline"
            label="Teams & settings"
            onPress={handleTeamsSettings}
            isLast
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  lead: {
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
