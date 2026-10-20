import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SelectOptionsSheet } from '../../../../components/forms/SelectOptionsSheet';
import { ErrorState } from '../../../../components/ecommerce/ErrorState';
import { AppButton } from '../../../../components/ui/AppButton';
import { AppCard } from '../../../../components/ui/AppCard';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../../design-system';
import type { SellerProfile } from '../../types/sellerProfile';
import { useShippingCurrencyOptions } from '../hooks/useShippingCurrencyOptions';
import { resolveShippingCurrencyLabel } from '../utils/sellerShippingMappers';
import { ShippingRegionSection } from './ShippingRegionSection';
import type { SellerShippingFormState } from '../types/sellerShipping';

export interface SellerShippingConfigEditorProps {
  title?: string;
  profile: SellerProfile | null;
  form: SellerShippingFormState;
  isSaving: boolean;
  saveError: string | null;
  saveSuccessMessage: string | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onUpdateForm: (updater: (current: SellerShippingFormState) => SellerShippingFormState) => void;
  onChangeCurrency: (currency: string) => Promise<void>;
  onSave: () => Promise<boolean | null>;
  onClearSaveError: () => void;
}

export function SellerShippingConfigEditor({
  title = 'Shipping',
  profile,
  form,
  isSaving,
  saveError,
  saveSuccessMessage,
  contentContainerStyle,
  onUpdateForm,
  onChangeCurrency,
  onSave,
  onClearSaveError,
}: SellerShippingConfigEditorProps) {
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const { options: currencyOptions } = useShippingCurrencyOptions(form.currency);

  const selectedCurrencyLabel = resolveShippingCurrencyLabel(form.currency, currencyOptions);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppCard variant="flat">
          <AppText variant="bodyMedium" style={styles.pageTitle}>
            {title}
          </AppText>

          <View style={styles.block}>
            <AppText variant="bodyMedium" style={styles.blockTitle}>
              Currency
            </AppText>
            <View style={styles.blockDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setCurrencyPickerVisible(true)}
              style={({ pressed }) => [styles.currencyRow, pressed && styles.pressed]}
            >
              <AppText variant="bodyMedium">{selectedCurrencyLabel}</AppText>
              <AppText variant="bodyMedium" color="textSecondary">
                ›
              </AppText>
            </Pressable>
          </View>

          <View style={styles.block}>
            <ShippingRegionSection
              title="Domestic"
              scope="domestic"
              currency={form.currency}
              countryCode={profile?.countryCode}
              region={form.domestic}
              onChange={(domestic) => onUpdateForm((current) => ({ ...current, domestic }))}
            />
          </View>

          <View style={styles.block}>
            <ShippingRegionSection
              title="International"
              scope="international"
              currency={form.currency}
              countryCode={profile?.countryCode}
              region={form.international}
              onChange={(international) => onUpdateForm((current) => ({ ...current, international }))}
            />
          </View>

          <AppText variant="caption" color="textSecondary" style={styles.requirementCopy}>
            At least one shipping method is required for both domestic and international orders.
          </AppText>
        </AppCard>

        {saveError ? (
          <ErrorState message={saveError} style={styles.banner} onAction={onClearSaveError} />
        ) : null}
        {saveSuccessMessage ? (
          <AppCard variant="flat" style={styles.successBanner}>
            <AppText variant="bodySmall" color="success">
              {saveSuccessMessage}
            </AppText>
          </AppCard>
        ) : null}

        <AppButton label={isSaving ? 'Saving...' : 'Save'} loading={isSaving} onPress={() => void onSave()} />
      </ScrollView>

      <SelectOptionsSheet
        visible={currencyPickerVisible}
        title="Store currency"
        options={currencyOptions}
        value={form.currency}
        searchable
        searchPlaceholder="Search currencies"
        emptyLabel="No currencies available"
        onSelect={(currency) => {
          void onChangeCurrency(currency);
        }}
        onClose={() => setCurrencyPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  block: {
    marginBottom: spacing.xl,
  },
  blockTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  blockDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.borderForm,
    backgroundColor: colors.surface,
  },
  requirementCopy: {
    lineHeight: 18,
  },
  banner: {
    alignSelf: 'stretch',
    marginHorizontal: 0,
  },
  successBanner: {
    borderColor: colors.success,
  },
  pressed: {
    opacity: 0.85,
  },
});
