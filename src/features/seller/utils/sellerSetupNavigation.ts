import type { SellerNavigation, SellerStackNavigation } from '../../../app/navigation/sellerTypes';
import type { SellerProfile, SellerSetupSectionId } from '../types/sellerProfile';
import { getContinueSetupSection } from './sellerSetupSections';
import { presentSellerSetupSaveFeedback } from './sellerSetupSaveFeedback';

export function navigateToSellerSetupHub(
  navigation: SellerNavigation,
  options?: { resetStack?: boolean },
): void {
  if (options?.resetStack) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'SellerSetup' }],
    });
    return;
  }

  navigation.navigate('SellerSetup');
}

/** Leave the seller stack and return to the shopping app (tab bar). */
export function exitSellerFlowToMainMenu(
  navigation: SellerNavigation,
): void {
  const root = navigation.getParent();
  if (root?.canGoBack()) {
    root.goBack();
  }
}

export function navigateToContinueSetupSection(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
): void {
  const nextSection = getContinueSetupSection(profile);

  if (!nextSection) {
    navigateToSellerSetupHub(navigation);
    return;
  }

  if (nextSection === 'domesticShipping' || nextSection === 'internationalShipping') {
    navigation.navigate('SellerShippingConfig');
    return;
  }

  navigation.navigate('SellerSetupSection', { section: nextSection });
}

export function navigateAfterSetupSectionSave(
  navigation: SellerNavigation,
  profile: SellerProfile | null | undefined,
  currentSection: SellerSetupSectionId,
  wasSetupCompleteBeforeSave = false,
): void {
  const nextSection = getContinueSetupSection(profile);
  const feedbackOptions = { wasSetupCompleteBeforeSave };

  if (!nextSection) {
    if (profile) {
      presentSellerSetupSaveFeedback(navigation, profile, undefined, feedbackOptions);
    } else {
      navigateToSellerSetupHub(navigation, { resetStack: true });
    }
    return;
  }

  if (nextSection === currentSection) {
    if (profile) {
      presentSellerSetupSaveFeedback(navigation, profile, undefined, feedbackOptions);
    } else {
      navigateToSellerSetupHub(navigation, { resetStack: true });
    }
    return;
  }

  if (nextSection === 'domesticShipping' || nextSection === 'internationalShipping') {
    (navigation as SellerStackNavigation).replace('SellerShippingConfig');
    return;
  }

  (navigation as SellerStackNavigation).replace('SellerSetupSection', { section: nextSection });
}

/** After shipping save — alert immediately, then open setup hub when all sections are done. */
export function navigateAfterShippingSetupSave(
  navigation: SellerNavigation,
  profile?: SellerProfile | null,
  wasSetupCompleteBeforeSave = false,
): void {
  if (!profile) {
    return;
  }

  presentSellerSetupSaveFeedback(
    navigation,
    profile,
    'Shipping settings saved. Complete any remaining setup sections to start selling.',
    { wasSetupCompleteBeforeSave },
  );
}
