import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SelectField } from '../../../../components/forms';
import { AppCard } from '../../../../components/ui/AppCard';
import { AppText } from '../../../../components/ui/AppText';
import { colors, spacing } from '../../../../design-system';
import type { AdminStackParamList } from '../../navigation/adminTypes';
import { useRequireAdmin } from '../../hooks/useRequireAdmin';
import { authReturnTo } from '../../../auth/utils/authNavigation';
import { useAuth } from '../../../auth/hooks/useAuth';
import { useAdminSellerPicker } from '../../product-management/hooks/useAdminSellerPicker';
import { ServiceTeamsSettingsScreen } from '../../../services/screens/ServiceTeamsSettingsScreen';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminServiceTeamsSettings'>;

export function AdminServiceTeamsSettingsScreen({ route }: Props) {
  const { isAuthorized } = useRequireAdmin(authReturnTo.adminListingManagement());
  const { user } = useAuth();
  const { options: sellerOptions, isLoading, error: sellerLoadError } = useAdminSellerPicker(
    isAuthorized,
  );
  const initialSellerId = route.params?.sellerId?.trim() ?? '';
  const [selectedSellerId, setSelectedSellerId] = useState(initialSellerId);

  useEffect(() => {
    if (initialSellerId) {
      setSelectedSellerId(initialSellerId);
    }
  }, [initialSellerId]);

  const selectedSellerLabel = useMemo(
    () => sellerOptions.find((option) => option.value === selectedSellerId)?.label,
    [selectedSellerId, sellerOptions],
  );

  const accessToken = user?.accessToken;
  const canManage = Boolean(selectedSellerId && accessToken);

  if (!isAuthorized) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.headerContent,
          { paddingBottom: spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="bodySmall" color="textMuted">
          Manage shop hours and bookable staff for a seller's service listings.
        </AppText>

        <AppCard style={styles.pickerCard}>
          <SelectField
            label="Seller shop"
            value={selectedSellerId}
            options={sellerOptions}
            placeholder={isLoading ? 'Loading sellers…' : 'Select seller…'}
            onChange={setSelectedSellerId}
            modalTitle="Select seller"
          />
          {sellerLoadError ? (
            <AppText variant="caption" color="error">
              {sellerLoadError}
            </AppText>
          ) : null}
        </AppCard>

        {canManage && selectedSellerLabel ? (
          <AppText variant="bodySmall" color="textPrimary" style={styles.managingLine}>
            Managing shop:{' '}
            <AppText variant="bodyMedium" style={styles.managingName}>
              {selectedSellerLabel}
            </AppText>
          </AppText>
        ) : null}

        {!canManage ? (
          <AppText variant="body" color="textMuted" style={styles.placeholder}>
            {selectedSellerId && !accessToken
              ? 'Sign in again to manage service settings.'
              : 'Choose a seller to edit availability and team members.'}
          </AppText>
        ) : null}
      </ScrollView>

      {canManage ? (
        <View style={styles.settingsBody}>
          <ServiceTeamsSettingsScreen
            key={selectedSellerId}
            sellerId={selectedSellerId}
            accessToken={accessToken}
            title="Service teams & settings"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 0,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  pickerCard: {
    gap: spacing.sm,
  },
  managingLine: {
    paddingHorizontal: spacing.lg,
  },
  managingName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  placeholder: {
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  settingsBody: {
    flex: 1,
    minHeight: 0,
  },
});
