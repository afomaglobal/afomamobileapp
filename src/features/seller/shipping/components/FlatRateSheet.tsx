import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../../../components/ui/AppButton';
import { AppInput } from '../../../../components/ui/AppInput';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../../design-system';
import type { FlatRateOptionsForm, ShippingScope } from '../types/sellerShipping';
import { validateFlatRateOptions } from '../utils/sellerShippingMappers';

export interface FlatRateSheetProps {
  visible: boolean;
  currency: string;
  scope: ShippingScope;
  value: FlatRateOptionsForm;
  onClose: () => void;
  onSave: (value: FlatRateOptionsForm, enabled: boolean) => void;
}

export function FlatRateSheet({
  visible,
  currency,
  scope,
  value,
  onClose,
  onSave,
}: FlatRateSheetProps) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setError(null);
    }
  }, [value, visible]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const freeShippingCopy =
    scope === 'domestic'
      ? 'Buyers in your country can get free flat-rate shipping (same as web).'
      : 'Buyers outside your country can get free flat-rate shipping.';

  const handleSave = () => {
    if (!draft.free_shipping && !draft.is_flat_rate && !draft.is_flat_weighted) {
      setError('Turn on free shipping, fixed rate, or weighted rates.');
      return;
    }

    const validationError = validateFlatRateOptions(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSave(draft, true);
    onClose();
  };

  const handleDisable = () => {
    onSave(
      {
        free_shipping: false,
        is_flat_rate: false,
        flat_rate_rate: '',
        additional_cost: '',
        is_flat_weighted: false,
        flat_rate_0_1: '',
        flat_rate_1_5: '',
        flat_rate_5_A: '',
      },
      false,
    );
    onClose();
  };

  const currencyCode = currency.toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close flat rate" />

        <View
          style={[
            styles.sheet,
            shadows.modal,
            {
              marginBottom: keyboardHeight,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={styles.handle} />
          <AppText variant="h3" style={styles.title}>
            Flat rate options
          </AppText>
          <AppText variant="bodySmall" color="textSecondary" style={styles.copy}>
            Rates are entered in {currencyCode} and converted to CAD when saved.
          </AppText>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <OptionCard
              title="Free shipping"
              enabled={draft.free_shipping}
              onToggle={(enabled) => {
                setDraft((current) => ({ ...current, free_shipping: enabled }));
                setError(null);
              }}
            >
              <AppText variant="caption" color="textSecondary">
                {freeShippingCopy}
              </AppText>
            </OptionCard>

            <OptionCard
              title="Set flat rate"
              enabled={draft.is_flat_rate}
              disabled={draft.is_flat_weighted}
              onToggle={(enabled) => {
                setDraft((current) => ({
                  ...current,
                  is_flat_rate: enabled,
                  is_flat_weighted: enabled ? false : current.is_flat_weighted,
                }));
                setError(null);
              }}
            >
              <AppInput
                tone="surface"
                label={`Flat rate (${currencyCode})`}
                value={draft.flat_rate_rate}
                onChangeText={(text) => setDraft((current) => ({ ...current, flat_rate_rate: text }))}
                keyboardType="decimal-pad"
                editable={draft.is_flat_rate}
              />
              <AppInput
                tone="surface"
                label={`Additional item cost (${currencyCode})`}
                value={draft.additional_cost}
                onChangeText={(text) => setDraft((current) => ({ ...current, additional_cost: text }))}
                keyboardType="decimal-pad"
                editable={draft.is_flat_rate}
              />
            </OptionCard>

            <OptionCard
              title="Set weighted rate"
              enabled={draft.is_flat_weighted}
              disabled={draft.is_flat_rate}
              onToggle={(enabled) => {
                setDraft((current) => ({
                  ...current,
                  is_flat_weighted: enabled,
                  is_flat_rate: enabled ? false : current.is_flat_rate,
                }));
                setError(null);
              }}
            >
              <AppInput
                tone="surface"
                label={`0–1 kg (${currencyCode})`}
                value={draft.flat_rate_0_1}
                onChangeText={(text) => setDraft((current) => ({ ...current, flat_rate_0_1: text }))}
                keyboardType="decimal-pad"
                editable={draft.is_flat_weighted}
              />
              <AppInput
                tone="surface"
                label={`1–5 kg (${currencyCode})`}
                value={draft.flat_rate_1_5}
                onChangeText={(text) => setDraft((current) => ({ ...current, flat_rate_1_5: text }))}
                keyboardType="decimal-pad"
                editable={draft.is_flat_weighted}
              />
              <AppInput
                tone="surface"
                label={`5+ kg (${currencyCode})`}
                value={draft.flat_rate_5_A}
                onChangeText={(text) => setDraft((current) => ({ ...current, flat_rate_5_A: text }))}
                keyboardType="decimal-pad"
                editable={draft.is_flat_weighted}
              />
            </OptionCard>

            {error ? (
              <AppText variant="caption" color="error">
                {error}
              </AppText>
            ) : null}

            <View style={styles.actions}>
              <AppButton label="Save flat rate" onPress={handleSave} />
              <AppButton label="Disable flat rate" variant="secondary" onPress={handleDisable} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OptionCard({
  title,
  enabled,
  disabled = false,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <View style={[styles.optionCard, enabled && styles.optionCardSelected, disabled && styles.optionCardDisabled]}>
      <View style={styles.optionHeader}>
        <AppText variant="bodyMedium" style={styles.optionTitle}>
          {title}
        </AppText>
        <Switch
          value={enabled}
          disabled={disabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>
      {enabled ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  copy: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  optionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.large,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  optionCardSelected: {
    borderColor: colors.primary,
  },
  optionCardDisabled: {
    opacity: 0.55,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
