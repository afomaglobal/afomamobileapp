import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../../../app/navigation/types';
import { AppButton } from '../../../../components/ui/AppButton';
import { AppText } from '../../../../components/ui/AppText';
import { spacing } from '../../../../design-system';
import { AuthFlowScreen } from '../../../auth/components/AuthFlowScreen';
import { SellerRegistrationPlanPicker } from '../components/SellerRegistrationPlanPicker';
import type { SellerBillingCycle, SellerMembershipTierId } from '../types/sellerMembership';
import { tierRequiresPayment } from '../utils/membershipDisplay';

type Props = NativeStackScreenProps<AuthStackParamList, 'SellerPlanPicker'>;

export function SellerPlanPickerScreen({ navigation, route }: Props) {
  const country = route.params?.country ?? '';
  const [selectedTier, setSelectedTier] = useState<SellerMembershipTierId>('test_drive');
  const [billingCycle, setBillingCycle] = useState<SellerBillingCycle>('monthly');

  const effectiveBillingCycle: SellerBillingCycle =
    selectedTier === 'test_drive' ? 'none' : billingCycle;

  const continueLabel = useMemo(() => {
    if (tierRequiresPayment(selectedTier, effectiveBillingCycle)) {
      return 'Continue to registration';
    }
    return 'Continue with free plan';
  }, [effectiveBillingCycle, selectedTier]);

  const handleContinue = () => {
    navigation.navigate('RegisterAccount', {
      accountType: 'seller',
      membershipTier: selectedTier,
      billingCycle: effectiveBillingCycle,
    });
  };

  return (
    <AuthFlowScreen
      title="Choose your seller plan"
      subtitle="Pick the membership tier that fits your shop. You can upgrade later from Account."
      onBack={() => navigation.goBack()}
    >
      <SellerRegistrationPlanPicker
        country={country}
        membershipTier={selectedTier}
        billingCycle={billingCycle}
        onTierChange={setSelectedTier}
        onBillingCycleChange={setBillingCycle}
      />

      <AppButton
        label={continueLabel}
        fullWidth
        size="lg"
        shape="pill"
        onPress={handleContinue}
        disabled={!country}
        style={{ marginTop: spacing.lg }}
      />

      {!country ? (
        <AppText variant="bodySmall" color="textSecondary" style={{ marginTop: spacing.sm }}>
          This screen requires a registration country. Use Register as seller from the sign-up flow.
        </AppText>
      ) : null}
    </AuthFlowScreen>
  );
}
