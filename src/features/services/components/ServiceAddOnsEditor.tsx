import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppInput } from '../../../components/ui/AppInput';
import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import { createEmptyServiceAddOn, type ServiceAddOnDraft } from '../utils/serviceAddOns';

export interface ServiceAddOnsEditorProps {
  addOns: ServiceAddOnDraft[];
  listingCurrency?: string;
  onChange: (addOns: ServiceAddOnDraft[]) => void;
}

export function ServiceAddOnsEditor({
  addOns,
  listingCurrency = 'cad',
  onChange,
}: ServiceAddOnsEditorProps) {
  const currencyLabel = listingCurrency.toUpperCase();

  const updateRow = (index: number, patch: Partial<ServiceAddOnDraft>) => {
    onChange(addOns.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(addOns.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...addOns, createEmptyServiceAddOn()]);
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="h3">Add-ons (optional)</AppText>
      <AppText variant="bodySmall" color="textSecondary">
        Extras customers can add when booking. Prices use {currencyLabel}. Inactive add-ons stay
        saved but are hidden on the storefront.
      </AppText>

      {addOns.length === 0 ? (
        <AppText variant="bodySmall" color="textMuted">
          No add-ons yet.
        </AppText>
      ) : (
        addOns.map((row, index) => (
          <View key={row.clientId || row._id || `addon-${index}`} style={styles.row}>
            <View style={styles.rowHeader}>
              <AppText variant="label">Add-on {index + 1}</AppText>
              <View style={styles.rowHeaderActions}>
                <View style={styles.activeRow}>
                  <AppText variant="caption">Active</AppText>
                  <Switch
                    value={row.active !== false}
                    onValueChange={(active) => updateRow(index, { active })}
                  />
                </View>
                <Pressable onPress={() => removeRow(index)} hitSlop={8}>
                  <AppText variant="caption" color="error">
                    Remove
                  </AppText>
                </Pressable>
              </View>
            </View>
            <AppInput
              label="Name"
              value={row.name}
              onChangeText={(name) => updateRow(index, { name })}
              placeholder="e.g. Beard trim"
            />
            <AppInput
              label={`Price (+ ${currencyLabel})`}
              value={row.price}
              onChangeText={(price) => updateRow(index, { price })}
              keyboardType="decimal-pad"
              placeholder="10"
            />
            <AppInput
              label="Extra time (minutes)"
              value={row.extraMinutes ?? ''}
              onChangeText={(extraMinutes) => updateRow(index, { extraMinutes })}
              keyboardType="number-pad"
              placeholder="0"
            />
            <AppInput
              label="Description (optional)"
              value={row.description ?? ''}
              onChangeText={(description) => updateRow(index, { description })}
              placeholder="Short note for customers"
              multiline
            />
          </View>
        ))
      )}

      <AppButton label="Add add-on" variant="outline" onPress={addRow} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
