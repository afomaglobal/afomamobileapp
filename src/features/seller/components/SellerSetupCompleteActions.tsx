import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import { spacing } from '../../../design-system';

export interface SellerSetupCompleteActionsProps {
  onAddProduct: () => void;
  onAddService: () => void;
  onBackToMenu: () => void;
}

export function SellerSetupCompleteActions({
  onAddProduct,
  onAddService,
  onBackToMenu,
}: SellerSetupCompleteActionsProps) {
  return (
    <View style={styles.container}>
      <AppText variant="bodySmall" color="textSecondary" style={styles.copy}>
        {"You're ready to sell. Add your first listing or return to the app menu."}
      </AppText>
      <AppButton label="List a product" onPress={onAddProduct} fullWidth />
      <AppButton label="List a service" variant="secondary" onPress={onAddService} fullWidth />
      <AppButton label="Back to menu" variant="outline" onPress={onBackToMenu} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  copy: {
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});
