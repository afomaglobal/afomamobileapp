import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../../components/ui/AppText';
import { colors, spacing } from '../../../../design-system';
import type { SellerStackParamList } from '../../../../app/navigation/sellerTypes';
import { authReturnTo } from '../../../auth/utils/authNavigation';
import { useRequireSeller } from '../../hooks/useRequireSeller';
import { useSellerProfile } from '../../hooks/useSellerProfile';
import { SellerListingHubRow } from '../components/SellerListingHubRow';
import {
  navigateToSellerListingList,
  openSellerAddProductFlow,
  openSellerAddServiceFlow,
} from '../utils/sellerListingHubNavigation';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerListingManagement'>;

const LISTING_HUB_RETURN_TO = authReturnTo.sellerListingManagement();

export function SellerListingManagementScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthorized, sellerId } = useRequireSeller(LISTING_HUB_RETURN_TO);
  const { profile } = useSellerProfile(isAuthorized ? sellerId : undefined);

  const openProducts = useCallback(() => {
    navigateToSellerListingList(navigation, 'products');
  }, [navigation]);

  const openServices = useCallback(() => {
    navigateToSellerListingList(navigation, 'services');
  }, [navigation]);

  const handleAddProduct = useCallback(() => {
    openSellerAddProductFlow(navigation, profile);
  }, [navigation, profile]);

  const handleAddService = useCallback(() => {
    void openSellerAddServiceFlow(navigation, profile, sellerId);
  }, [navigation, profile, sellerId]);

  const handleTeamsSettings = useCallback(() => {
    navigation.navigate('SellerServiceTeamsSettings');
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
        Manage product and service listings the same way as on the web seller dashboard.
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
