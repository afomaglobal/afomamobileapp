import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/ui/AppCard';
import { SellerSetupProgress } from '../../seller/components/SellerSetupProgress';
import type { SellerProfile, SellerProfileSetup } from '../../seller/types/sellerProfile';
import { isSellerSetupFlowComplete } from '../../seller/utils/sellerSetupSections';

export interface AccountSellerSetupCardProps {
  profile?: SellerProfile | null;
  profileSetup?: SellerProfileSetup;
  onContinueSetup: () => void;
}

export function AccountSellerSetupCard({
  profile,
  profileSetup,
  onContinueSetup,
}: AccountSellerSetupCardProps) {
  const isComplete = isSellerSetupFlowComplete(profileSetup, profile);

  if (isComplete) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue seller setup"
        onPress={onContinueSetup}
      >
        <AppCard variant="flat">
          <SellerSetupProgress
            profile={profile}
            profileSetup={profileSetup}
            onContinue={onContinueSetup}
            title="Finish setting up your shop"
            subtitle="Complete the remaining steps to start selling."
            continueLabel="Continue setup →"
          />
        </AppCard>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
});
