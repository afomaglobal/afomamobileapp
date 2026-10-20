import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '../../../components/ecommerce/ErrorState';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import type { SellerStackParamList } from '../../../app/navigation/sellerTypes';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { SellerSetupCompleteActions } from '../components/SellerSetupCompleteActions';
import { SellerSetupProgress } from '../components/SellerSetupProgress';
import { SellerSetupSectionRow } from '../components/SellerSetupSectionRow';
import {
  openSellerAddProductFlow,
  openSellerAddServiceFlow,
} from '../products/utils/sellerProductCreationNavigation';
import { useRequireSeller } from '../hooks/useRequireSeller';
import { useSellerProfile } from '../hooks/useSellerProfile';
import {
  isSellerSetupFlowComplete,
  SELLER_SETUP_SCREEN_SECTIONS,
} from '../utils/sellerSetupSections';
import {
  exitSellerFlowToMainMenu,
  navigateToContinueSetupSection,
} from '../utils/sellerSetupNavigation';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerSetup'>;

const SELLER_SETUP_RETURN_TO = authReturnTo.sellerSetup();

export function SellerSetupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthorized, sellerId } = useRequireSeller(SELLER_SETUP_RETURN_TO);
  const { profile, isLoading, error, reload } = useSellerProfile(isAuthorized ? sellerId : undefined);

  const setupComplete = isSellerSetupFlowComplete(profile?.profileSetup, profile);

  const handleContinue = () => {
    navigateToContinueSetupSection(navigation, profile);
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthorized && sellerId) {
        void reload();
      }
    }, [isAuthorized, reload, sellerId]),
  );

  if (!isAuthorized) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isLoading && !profile) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <AppCard variant="muted">
        <AppText variant="bodyMedium" style={styles.title}>
          Seller setup
        </AppText>
        <AppText variant="bodySmall" color="textSecondary" style={styles.copy}>
          Complete each section below. Progress is saved to your seller profile on the server.
        </AppText>
        <SellerSetupProgress
          profile={profile}
          profileSetup={profile?.profileSetup}
          onContinue={setupComplete ? undefined : handleContinue}
          title={setupComplete ? 'Seller setup complete' : undefined}
          subtitle={
            setupComplete
              ? 'Everything looks good. Choose what you want to do next.'
              : undefined
          }
        />
        {setupComplete ? (
          <SellerSetupCompleteActions
            onAddProduct={() => openSellerAddProductFlow(navigation, profile)}
            onAddService={() => {
              void openSellerAddServiceFlow(navigation, profile, sellerId);
            }}
            onBackToMenu={() => exitSellerFlowToMainMenu(navigation)}
          />
        ) : null}
      </AppCard>

      {error ? <ErrorState message={error} onAction={() => void reload()} style={styles.error} /> : null}

      <AppCard variant="flat">
        {SELLER_SETUP_SCREEN_SECTIONS.map((section) => (
          <SellerSetupSectionRow
            key={section.id}
            section={section}
            profileSetup={profile?.profileSetup}
            profile={profile}
            onPress={() => {
              if (section.id === 'domesticShipping' || section.id === 'internationalShipping') {
                navigation.navigate('SellerShippingConfig');
                return;
              }

              navigation.navigate('SellerSetupSection', { section: section.id });
            }}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  copy: { lineHeight: 20, marginBottom: spacing.md },
  error: { alignSelf: 'stretch', marginHorizontal: 0 },
});
