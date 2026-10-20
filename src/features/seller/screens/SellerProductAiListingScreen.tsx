import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useCallback } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { ErrorState } from '../../../components/ecommerce/ErrorState';

import { AppButton } from '../../../components/ui/AppButton';

import { AppCard } from '../../../components/ui/AppCard';

import { AppText } from '../../../components/ui/AppText';

import { ImageUploadSourceSheet } from '../../../components/ui/ImageUploadSourceSheet';

import { colors, radius, spacing } from '../../../design-system';

import type { SellerStackParamList } from '../../../app/navigation/sellerTypes';

import { authReturnTo } from '../../auth/utils/authNavigation';

import { useAdminProductAiListing } from '../../admin/product-management/hooks/useAdminProductAiListing';

import type { AdminProductAiListingType } from '../../admin/product-management/types/adminProductAiPrefill';

import { useRequireSeller } from '../hooks/useRequireSeller';

import { navigateToSellerWizardAfterAiPrefill } from '../products/utils/sellerProductAiListingNavigation';



type Props = NativeStackScreenProps<SellerStackParamList, 'SellerProductAiListing'>;



const RETURN_TO = authReturnTo.sellerProducts();



const PRODUCT_TYPE_LABELS: Record<AdminProductAiListingType, string> = {

  Standard: 'Standard product',

  Downloadable: 'Downloadable product',

  Customizable: 'Customizable product',

  Service: 'Service',

};



export function SellerProductAiListingScreen({ navigation, route }: Props) {

  const insets = useSafeAreaInsets();

  const productType = route.params.productType;

  const { isAuthorized, sellerId } = useRequireSeller(RETURN_TO);

  const aiListing = useAdminProductAiListing(productType, sellerId);



  const handleGenerate = useCallback(async () => {

    const prefill = await aiListing.generatePrefill();

    if (!prefill) {

      return;

    }

    navigateToSellerWizardAfterAiPrefill(navigation, productType);

  }, [aiListing, navigation, productType]);



  const handleSkip = useCallback(() => {

    navigateToSellerWizardAfterAiPrefill(navigation, productType, true);

  }, [navigation, productType]);



  if (!isAuthorized) {

    return (

      <View style={styles.centeredState}>

        <ActivityIndicator size="large" color={colors.primary} />

      </View>

    );

  }



  const photoLabel = productType === 'Service' ? 'Service photos' : 'Listing photos';

  const photoHint =

    productType === 'Service'

      ? 'Upload at least one photo. AI will draft the service name, description, category, duration, and SEO fields — same as the web seller form.'

      : `${PRODUCT_TYPE_LABELS[productType]} — upload photos and AI will draft the title, description, and SEO fields. You review everything before saving.`;



  return (

    <>

      <ScrollView

        style={styles.screen}

        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={false}

      >

        <View style={styles.intro}>

          <AppText variant="h3" style={styles.introTitle}>

            AI listing generator

          </AppText>

          <AppText variant="bodySmall" color="textSecondary">

            {photoHint}

          </AppText>

        </View>



        {aiListing.isGenerating ? (

          <AppCard variant="flat" style={styles.loadingCard}>

            <ActivityIndicator size="small" color={colors.primary} />

            <AppText variant="bodyMedium" style={styles.loadingTitle}>

              Generating your listing...

            </AppText>

            <AppButton label="Cancel" variant="outline" onPress={aiListing.cancelGeneration} />

          </AppCard>

        ) : (

          <>

            <AppCard variant="flat">

              <AppText variant="bodyMedium" style={styles.sectionTitle}>

                {photoLabel}

              </AppText>

              <AppText variant="caption" color="textMuted" style={styles.sectionHint}>

                Add at least {aiListing.minImages} photo{aiListing.minImages === 1 ? '' : 's'}. Up to 8

                total.

              </AppText>



              <View style={styles.imageGrid}>

                {aiListing.images.map((image) => (

                  <View key={image.id} style={styles.imageTile}>

                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />

                    <Pressable

                      accessibilityRole="button"

                      onPress={() => aiListing.removeImage(image.id)}

                      style={styles.removeBadge}

                    >

                      <AppText variant="caption" color="textInverse">

                        Remove

                      </AppText>

                    </Pressable>

                  </View>

                ))}

              </View>



              <AppButton

                label="Add photos"

                variant="outline"

                onPress={() => void aiListing.addImagesFromPicker()}

              />

            </AppCard>



            {aiListing.error ? (

              <ErrorState

                message={aiListing.error}

                onAction={aiListing.clearError}

                style={styles.inlineError}

              />

            ) : null}



            <AppButton

              label="Generate listing"

              onPress={() => void handleGenerate()}

              disabled={aiListing.images.length < aiListing.minImages}

              fullWidth

            />



            <AppButton label="Skip — enter manually" variant="outline" onPress={handleSkip} fullWidth />

          </>

        )}

      </ScrollView>



      <ImageUploadSourceSheet {...aiListing.imageUploadSheetProps} />

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

  centeredState: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: colors.background,

  },

  intro: {

    gap: spacing.sm,

  },

  introTitle: {

    color: colors.textPrimary,

  },

  loadingCard: {

    alignItems: 'center',

    gap: spacing.md,

  },

  loadingTitle: {

    fontWeight: '700',

    color: colors.textPrimary,

    textAlign: 'center',

  },

  sectionTitle: {

    fontWeight: '700',

    color: colors.textPrimary,

    marginBottom: spacing.xs,

  },

  sectionHint: {

    marginBottom: spacing.md,

  },

  imageGrid: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: spacing.sm,

    marginBottom: spacing.md,

  },

  imageTile: {

    width: 96,

    height: 96,

    borderRadius: radius.medium,

    overflow: 'hidden',

    backgroundColor: colors.surfaceMuted,

  },

  imagePreview: {

    width: '100%',

    height: '100%',

  },

  removeBadge: {

    position: 'absolute',

    bottom: 0,

    left: 0,

    right: 0,

    backgroundColor: 'rgba(0,0,0,0.55)',

    paddingVertical: spacing.xs,

    alignItems: 'center',

  },

  inlineError: {

    marginHorizontal: 0,

  },

});

