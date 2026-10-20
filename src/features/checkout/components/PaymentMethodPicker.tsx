import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../design-system';
import type { PaymentMethodId } from './PaymentMethodOption';

export interface PaymentMethodPickerItem {
  id: PaymentMethodId;
  label: string;
  subtitle?: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  external?: boolean;
}

interface PaymentMethodPickerProps {
  methods: PaymentMethodPickerItem[];
  selectedMethod: PaymentMethodId;
  onSelectMethod: (id: PaymentMethodId) => void;
  introHint?: string;
  proceedHint?: string;
}

function PaymentMethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethodPickerItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: method.disabled }}
      disabled={method.disabled}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.methodCard,
        selected && styles.methodCardSelected,
        method.disabled && styles.methodCardDisabled,
        pressed && !method.disabled && styles.pressed,
      ]}
    >
      <View style={styles.methodHeader}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={method.icon}
            size={22}
            color={method.disabled ? colors.textMuted : colors.primary}
          />
        </View>

        <View style={styles.copy}>
          <AppText variant="bodyMedium" style={styles.label}>
            {method.label}
          </AppText>
          {method.subtitle ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {method.subtitle}
            </AppText>
          ) : null}
        </View>

        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
          {selected ? <View style={styles.radioInner} /> : null}
        </View>
        {method.external ? (
          <Ionicons name="open-outline" size={16} color={colors.textMuted} style={styles.externalIcon} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function PaymentMethodPicker({
  methods,
  selectedMethod,
  onSelectMethod,
  introHint,
  proceedHint,
}: PaymentMethodPickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="bodyMedium" style={styles.title}>
          How would you like to pay?
        </AppText>
        {introHint ? (
          <AppText variant="bodySmall" color="textSecondary">
            {introHint}
          </AppText>
        ) : null}
      </View>

      <View style={styles.methodList}>
        {methods.map((method) => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            selected={selectedMethod === method.id}
            onSelect={() => onSelectMethod(method.id)}
          />
        ))}
      </View>

      {proceedHint ? (
        <View style={styles.proceedHint}>
          <AppText variant="bodySmall" color="textSecondary">
            {proceedHint}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  proceedHint: {
    paddingTop: spacing.xs,
  },
  methodList: {
    gap: spacing.sm,
  },
  methodCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    ...shadows.card,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  methodCardDisabled: {
    opacity: 0.55,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  externalIcon: {
    flexShrink: 0,
    marginLeft: -spacing.xs,
  },
  pressed: {
    opacity: 0.88,
  },
});
