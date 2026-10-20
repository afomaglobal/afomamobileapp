import { Alert } from 'react-native';
import type { SellerNavigation } from '../../../app/navigation/sellerTypes';
import type { SellerProfile } from '../types/sellerProfile';
import {
  isSellerSetupFlowComplete,
  SELLER_SETUP_SCREEN_SECTION_COUNT,
} from './sellerSetupSections';
export function presentSellerSetupCompleteAlert(onContinue: () => void): void {
  Alert.alert(
    'Seller setup complete',
    `All ${SELLER_SETUP_SCREEN_SECTION_COUNT} sections are finished. You're ready to list products and services.`,
    [{ text: 'Continue', onPress: onContinue }],
  );
}

export function presentSellerSetupPartialSaveAlert(message: string): void {
  Alert.alert('Saved', message, [{ text: 'OK' }]);
}

export interface SellerSetupSaveFeedbackOptions {
  /** When true, setup was already 8/8 before this save — skip the one-time completion alert. */
  wasSetupCompleteBeforeSave?: boolean;
}

export function presentSellerSetupSaveFeedback(
  navigation: SellerNavigation,
  profile: SellerProfile,
  partialSaveMessage = 'Your changes were saved.',
  options?: SellerSetupSaveFeedbackOptions,
): void {
  const isCompleteNow = isSellerSetupFlowComplete(profile.profileSetup, profile);
  const newlyComplete = isCompleteNow && !options?.wasSetupCompleteBeforeSave;

  if (newlyComplete) {
    presentSellerSetupCompleteAlert(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'SellerSetup' }],
      });
    });
    return;
  }

  presentSellerSetupPartialSaveAlert(
    isCompleteNow ? 'Your changes were saved.' : partialSaveMessage,
  );
}
