import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  KeyboardAwareFormScreen,
  ProductDescriptionInput,
  ProductNameInput,
  SelectField,
} from '../../../components/forms';
import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppInput } from '../../../components/ui/AppInput';
import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import { StandardProductImageList } from '../../seller/products/components/StandardProductImageList';
import { ListingFeePaymentModal } from '../../seller/membership/components/ListingFeePaymentModal';
import type { useServiceProductWizard } from '../hooks/useServiceProductWizard';
import { useServiceVerticalPicker } from '../hooks/useServiceVerticalPicker';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';
import { createDefaultWeeklyHours } from '../utils/serviceBookingConstants';
import { SERVICE_WIZARD_STEPS } from '../utils/serviceProductConstants';
import type { SellerStackParamList } from '../../../app/navigation/sellerTypes';
import { navigateToSellerProductAiListing } from '../../seller/products/utils/sellerProductAiListingNavigation';
import { ServiceAddOnsEditor } from './ServiceAddOnsEditor';

type Wizard = ReturnType<typeof useServiceProductWizard>;

const PRICE_TYPES = [
  { label: 'Fixed price', value: 'fixed' },
  { label: 'From (starting at)', value: 'from' },
  { label: 'Custom quote', value: 'custom_quote' },
];

const LOCATION_OPTIONS = [
  { label: 'Shop service', value: 'at_salon' },
  { label: 'Home service', value: 'mobile' },
  { label: 'Both (customer chooses)', value: 'both' },
];

export interface ServiceProductFormProps {
  wizard: Wizard;
  isEditMode: boolean;
  navigation?: NativeStackNavigationProp<SellerStackParamList, 'SellerServiceProduct'>;
  /** Admin — seller picker on basics step (before service name). */
  beforeServiceNameContent?: ReactNode;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodySmall">{value || '—'}</AppText>
    </View>
  );
}

export function ServiceProductForm({
  wizard,
  isEditMode,
  navigation,
  beforeServiceNameContent,
}: ServiceProductFormProps) {
  const verticals = useServiceVerticalPicker();

  useEffect(() => {
    const match = verticals.verticals.find((vertical) => vertical._id === wizard.values.categoryId);
    if (match?.slug && match.slug !== verticals.verticalSlug) {
      verticals.setVerticalSlug(match.slug);
    }
  }, [wizard.values.categoryId, verticals.verticalSlug, verticals.verticals, verticals.setVerticalSlug]);

  const categoryOptions = verticals.verticals.map((v) => ({
    label: v.name ?? 'Category',
    value: v._id ?? '',
  }));
  const subOptions = verticals.subcategories.map((s) => ({
    label: s.name ?? 'Subcategory',
    value: s._id ?? '',
  }));
  const staffOptions = wizard.staffOptions.map((s) => ({
    label: s.displayName ?? 'Staff',
    value: String(s._id),
  }));

  const categoryLabel =
    categoryOptions.find((o) => o.value === wizard.values.categoryId)?.label ?? '—';
  const subcategoryLabel =
    subOptions.find((o) => o.value === wizard.values.subCategoryId)?.label ?? '—';
  const locationLabel =
    LOCATION_OPTIONS.find((o) => o.value === wizard.values.serviceLocation)?.label ?? '—';
  const priceTypeLabel =
    PRICE_TYPES.find((o) => o.value === wizard.values.priceType)?.label ?? wizard.values.priceType;

  const assignedStaff =
    wizard.values.staffIds.length > 0
      ? staffOptions
          .filter((o) => wizard.values.staffIds.includes(o.value))
          .map((o) => o.label)
          .join(', ')
      : 'Any available team member';

  const renderStep = () => {
    switch (wizard.currentStep.id) {
      case 'basics':
        return (
          <View style={styles.stepContent}>
            {beforeServiceNameContent ? (
              <View style={styles.beforeNameBlock}>{beforeServiceNameContent}</View>
            ) : null}
            <ProductNameInput
              label="Service name *"
              value={wizard.values.productName}
              onChangeText={(productName) => wizard.patchValues({ productName })}
              error={wizard.fieldErrors.productName}
            />
            <ProductDescriptionInput
              label="Description *"
              value={wizard.values.description}
              onChangeText={(description) => wizard.patchValues({ description })}
              error={wizard.fieldErrors.description}
            />
          </View>
        );

      case 'catalog':
        return (
          <View style={styles.stepContent}>
            <SelectField
              label="Service category *"
              value={wizard.values.categoryId}
              options={categoryOptions}
              onChange={(categoryId) => wizard.patchValues({ categoryId, subCategoryId: '' })}
              error={wizard.fieldErrors.categoryId}
            />
            <SelectField
              label="Subcategory *"
              value={wizard.values.subCategoryId}
              options={subOptions}
              onChange={(subCategoryId) => wizard.patchValues({ subCategoryId })}
              error={wizard.fieldErrors.subCategoryId}
            />
            <StandardProductImageList
              images={wizard.images}
              minImages={1}
              onAdd={() => void wizard.addImageFromPicker()}
              onRemove={wizard.removeImage}
              onMove={() => undefined}
              onAltTextChange={wizard.updateImageAltText}
              imageUploadSheetProps={wizard.imageUploadSheetProps}
            />
            {wizard.fieldErrors.images ? (
              <AppText variant="caption" color="error">
                {wizard.fieldErrors.images}
              </AppText>
            ) : null}
            {wizard.imageError ? (
              <AppText variant="caption" color="error">
                {wizard.imageError}
              </AppText>
            ) : null}
          </View>
        );

      case 'booking':
        return (
          <View style={styles.stepContent}>
            <AppInput
              label="Duration (minutes) *"
              value={wizard.values.durationMinutes}
              onChangeText={(durationMinutes) => wizard.patchValues({ durationMinutes })}
              keyboardType="number-pad"
              error={wizard.fieldErrors.durationMinutes}
            />
            <SelectField
              label="Service location *"
              value={wizard.values.serviceLocation}
              options={LOCATION_OPTIONS}
              onChange={(serviceLocation) =>
                wizard.patchValues({
                  serviceLocation: serviceLocation as typeof wizard.values.serviceLocation,
                })
              }
              error={wizard.fieldErrors.serviceLocation}
            />
            {staffOptions.length ? (
              <View style={styles.staffBlock}>
                <AppText variant="bodyMedium">Assigned team (optional)</AppText>
                {staffOptions.map((opt) => {
                  const selected = wizard.values.staffIds.includes(opt.value);
                  return (
                    <View key={opt.value} style={styles.switchRow}>
                      <AppText variant="bodySmall">{opt.label}</AppText>
                      <Switch
                        value={selected}
                        onValueChange={() => {
                          const next = selected
                            ? wizard.values.staffIds.filter((id) => id !== opt.value)
                            : [...wizard.values.staffIds, opt.value];
                          wizard.patchValues({ staffIds: next });
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.switchRow}>
              <AppText variant="body">Custom hours for this service</AppText>
              <Switch
                value={wizard.values.scheduleMode === 'custom'}
                onValueChange={(on) =>
                  wizard.patchValues({
                    scheduleMode: on ? 'custom' : 'inherit',
                    customWeeklyHours: on
                      ? wizard.values.customWeeklyHours.length
                        ? wizard.values.customWeeklyHours
                        : createDefaultWeeklyHours()
                      : [],
                  })
                }
              />
            </View>
            {wizard.values.scheduleMode === 'custom' ? (
              <WeeklyHoursEditor
                weeklyHours={wizard.values.customWeeklyHours}
                onChange={(customWeeklyHours) => wizard.patchValues({ customWeeklyHours })}
              />
            ) : null}
            <ServiceAddOnsEditor
              addOns={wizard.values.serviceAddOns}
              listingCurrency={wizard.values.currency}
              onChange={(serviceAddOns) => wizard.patchValues({ serviceAddOns })}
            />
          </View>
        );

      case 'pricing':
        return (
          <View style={styles.stepContent}>
            <SelectField
              label="Currency"
              value={wizard.values.currency}
              options={wizard.currencyOptions}
              searchable
              searchPlaceholder="Search currencies"
              disabled={wizard.isLoadingCurrencies}
              modalTitle="Currency"
              onChange={(currency) =>
                wizard.patchValues({ currency, currencyPrice: '', price: '' })
              }
            />
            {wizard.values.currency !== 'cad' ? (
              <AppInput
                label={`Price in ${wizard.values.currency.toUpperCase()} *`}
                value={wizard.values.currencyPrice}
                onChangeText={(text) => wizard.patchCurrencyPrice(text)}
                keyboardType="decimal-pad"
                error={wizard.fieldErrors.currencyPrice}
              />
            ) : null}
            <AppInput
              label="Price (CAD) *"
              value={wizard.values.price}
              onChangeText={(price) => wizard.patchValues({ price })}
              keyboardType="decimal-pad"
              editable={wizard.values.currency === 'cad'}
              error={wizard.fieldErrors.price}
            />
            <SelectField
              label="Price type"
              value={wizard.values.priceType}
              options={PRICE_TYPES}
              onChange={(priceType) =>
                wizard.patchValues({ priceType: priceType as typeof wizard.values.priceType })
              }
            />
            <View style={styles.switchRow}>
              <AppText variant="body">Allow online payment at checkout</AppText>
              <Switch
                value={wizard.values.acceptOnlinePayment}
                onValueChange={(acceptOnlinePayment) => wizard.patchValues({ acceptOnlinePayment })}
              />
            </View>
            <AppText variant="h3" style={styles.seoHeading}>
              SEO (optional)
            </AppText>
            <AppInput
              label="Meta title"
              value={wizard.values.metaTitle}
              onChangeText={(metaTitle) => wizard.patchValues({ metaTitle })}
              placeholder="Short title for search"
            />
            <AppInput
              label="Meta keywords"
              value={wizard.values.metaKeywords}
              onChangeText={(metaKeywords) => wizard.patchValues({ metaKeywords })}
              placeholder="Keywords"
            />
            <AppInput
              label="Meta description"
              value={wizard.values.metaDesc}
              onChangeText={(metaDesc) => wizard.patchValues({ metaDesc })}
              placeholder="Short description for search"
              multiline
            />
          </View>
        );

      case 'review':
        return (
          <View style={styles.stepContent}>
            <ReviewRow label="Service name" value={wizard.values.productName.trim()} />
            <ReviewRow label="Category" value={`${categoryLabel} · ${subcategoryLabel}`} />
            <ReviewRow label="Duration" value={`${wizard.values.durationMinutes} min`} />
            <ReviewRow label="Location" value={locationLabel} />
            <ReviewRow label="Team" value={assignedStaff} />
            <ReviewRow
              label="Schedule"
              value={
                wizard.values.scheduleMode === 'custom' ? 'Custom hours for this service' : 'Shop / team hours'
              }
            />
            <ReviewRow
              label="Add-ons"
              value={
                wizard.values.serviceAddOns.length
                  ? `${wizard.values.serviceAddOns.length} configured`
                  : 'None'
              }
            />
            <ReviewRow
              label="Price"
              value={`${wizard.values.currency.toUpperCase()} ${wizard.values.price} (${priceTypeLabel})`}
            />
            <ReviewRow
              label="Online payment"
              value={wizard.values.acceptOnlinePayment ? 'Allowed' : 'Pay at appointment only'}
            />
            <ReviewRow label="Images" value={`${wizard.uploadedImageCount} uploaded`} />

            {wizard.saveError ? (
              <AppText variant="bodySmall" color="error">
                {wizard.saveError}
              </AppText>
            ) : null}
            {wizard.submitError ? (
              <AppText variant="bodySmall" color="error">
                {wizard.submitError}
              </AppText>
            ) : null}
            {wizard.saveSuccessMessage ? (
              <AppText variant="bodySmall" color="textLink">
                {wizard.saveSuccessMessage}
              </AppText>
            ) : null}

            <AppButton label="Save draft" loading={wizard.isSaving} onPress={() => void wizard.save()} />
            {wizard.canSubmit ? (
              <AppButton
                label="Submit for review"
                variant="secondary"
                loading={wizard.isSubmitting}
                onPress={() => void wizard.submitForReview()}
              />
            ) : null}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <KeyboardAwareFormScreen contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="h2" style={styles.titleFlex}>
            {isEditMode ? 'Edit service' : 'Add service'}
          </AppText>
          {navigation ? (
            <AppButton
              label={isEditMode ? 'Edit with AI' : 'Generate with AI'}
              variant="outline"
              onPress={() => navigateToSellerProductAiListing(navigation, 'Service')}
            />
          ) : null}
        </View>

        <View style={styles.progressRow}>
          {SERVICE_WIZARD_STEPS.map((step, index) => (
            <View
              key={step.id}
              style={[styles.progressDot, index <= wizard.stepIndex && styles.progressDotActive]}
            />
          ))}
        </View>

        <AppCard variant="flat">
          <AppText variant="bodyMedium" style={styles.stepTitle}>
            {wizard.currentStep.title}
          </AppText>
          <AppText variant="caption" color="textMuted" style={styles.stepMeta}>
            Step {wizard.stepIndex + 1} of {SERVICE_WIZARD_STEPS.length}
          </AppText>
          {renderStep()}
        </AppCard>

        {wizard.currentStep.id !== 'review' ? (
          <View style={styles.footerActions}>
            {!wizard.isFirstStep ? (
              <AppButton label="Back" variant="outline" onPress={wizard.goBack} style={styles.footerButton} />
            ) : null}
            {!wizard.isLastStep ? (
              <AppButton label="Next" onPress={wizard.goNext} style={styles.footerButton} />
            ) : null}
          </View>
        ) : (
          <View style={styles.footerActions}>
            <AppButton label="Back" variant="outline" onPress={wizard.goBack} style={styles.footerButton} />
          </View>
        )}
      </KeyboardAwareFormScreen>
      <ListingFeePaymentModal {...wizard.listingFeePayment.modalProps} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  beforeNameBlock: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleFlex: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  stepTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepMeta: {
    marginBottom: spacing.md,
  },
  stepContent: {
    gap: spacing.md,
  },
  staffBlock: {
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  seoHeading: {
    marginTop: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  reviewRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
