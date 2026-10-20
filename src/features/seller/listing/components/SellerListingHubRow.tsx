import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChevronForwardIcon } from '../../../../components/ui/ChevronForwardIcon';
import { AppText } from '../../../../components/ui/AppText';
import { colors, spacing } from '../../../../design-system';

export interface SellerListingHubRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

export function SellerListingHubRow({
  icon,
  label,
  onPress,
  isLast = false,
}: SellerListingHubRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <AppText variant="bodyMedium" style={styles.label}>
        {label}
      </AppText>
      <ChevronForwardIcon color={colors.textMuted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    color: colors.textPrimary,
  },
});
