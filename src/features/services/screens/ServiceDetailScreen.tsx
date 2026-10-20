import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {

  Alert,

  Pressable,

  ScrollView,

  StyleSheet,

  View,

  type LayoutChangeEvent,

  type NativeScrollEvent,

  type NativeSyntheticEvent,

} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';



import { FadeInContent } from '../../../components/motion';

import { HeaderBackButton } from '../../../components/ui/HeaderBackButton';

import { AppText } from '../../../components/ui/AppText';

import { usePricing } from '../../../app/providers/PricingProvider';

import { colors, spacing } from '../../../design-system';

import { usePdpTheme } from '../../../design-system/pdpTheme';

import type { ShoppingStackParamList } from '../../../app/navigation/types';

import { navigateToShop } from '../../../app/navigation/shoppingNavigation';

import { useMarketplaceFooterContentInset } from '../../../app/navigation/marketplaceChrome';

import type { Product } from '../../../services/types/product';

import { useAuth } from '../../auth/hooks/useAuth';

import { resolveAuthUserId } from '../../auth/utils/resolveAuthUserId';

import { useCart } from '../../cart/hooks/useCart';

import { ProductDetailHeader } from '../../products/components/ProductDetailHeader';

import { ProductDetailItemDetailsSection } from '../../products/components/ProductDetailItemDetailsSection';

import { ProductDetailPoliciesSection } from '../../products/components/ProductDetailPoliciesSection';

import { ProductDetailReviewsSection } from '../../products/components/ProductDetailReviewsSection';

import { ProductDetailBottomDock, type ProductDetailBottomDockMode } from '../../products/components/ProductDetailBottomDock';

import {

  ProductDetailAddToCartCta,

  type ProductDetailAddToCartCtaMode,

} from '../../products/components/ProductDetailStickyBar';

import { ProductGallery } from '../../products/components/ProductGallery';

import { ProductMeetSellerSection } from '../../products/components/ProductMeetSellerSection';

import { SuggestedProductsSection } from '../../products/components/SuggestedProductsSection';

import { useProductDetail } from '../../products/hooks/useProductDetail';

import { useProductDetailRecommendations } from '../../products/hooks/useProductDetailRecommendations';

import { useProductReviews } from '../../products/hooks/useProductReviews';

import {

  getProductDisplayName,

  getProductRouteId,

  getSellerDisplayName,

  getSellerStorePolicy,

  hasDisplayableStorePolicy,

} from '../../products/utils/productDisplay';

import { getProductGalleryImages } from '../../products/utils/productGallery';

import { getProductShareUrl } from '../../products/utils/productShare';

import { promptProductShare } from '../../products/utils/shareProduct';

import {

  buildProductDetailAuthReturnTo,

  canShowProductSellerMessage,

  openProductSellerChat,

} from '../../products/utils/productSellerChat';

import {

  ServiceBookingPanel,

  type ServiceBookingPanelRef,

  type ServiceBookingUiState,

} from '../components/ServiceBookingPanel';

import { isServiceProduct } from '../utils/isServiceProduct';

import { navigateToCatalogListing } from '../utils/serviceDetailNavigation';


import { serviceLocationDetailLabel } from '../utils/serviceLocationOptions';

import {

  formatServicePriceLabel,

  getServiceDisplayPricing,

} from '../utils/serviceDisplayPricing';

import type { ServiceSlotSelectionHold } from '../types/service';



type Props = NativeStackScreenProps<ShoppingStackParamList, 'ServiceDetail'>;



const CONTENT_SHEET_OVERLAP = 16;

const SCROLL_DELTA_THRESHOLD = 8;

const AT_TOP_SCROLL_THRESHOLD = 24;



const DEFAULT_BOOKING_UI: ServiceBookingUiState = {

  canSubmit: false,

  submitting: false,

  notice: null,

  addButtonLabel: 'Add to Cart',

};



function buildServiceAvailabilityLabel(product: Product): string {

  const parts: string[] = [];

  const location = serviceLocationDetailLabel(product.serviceDetails?.serviceLocation);

  if (location) {

    parts.push(location);

  }

  const duration = product.serviceDetails?.durationMinutes;

  if (duration) {

    parts.push(`${duration} min`);

  }

  return parts.join(' · ') || 'Book an appointment';

}



export function ServiceDetailScreen({ navigation, route }: Props) {

  const { serviceSlug, productId } = route.params;

  const footerInset = useMarketplaceFooterContentInset();

  const theme = usePdpTheme();

  const { userInfo } = usePricing();

  const { user, isAuthenticated } = useAuth();

  const authUserId = resolveAuthUserId(user);

  const { cart, addServiceAppointment } = useCart();

  const bookingRef = useRef<ServiceBookingPanelRef>(null);

  const scrollContentRef = useRef<View>(null);

  const inlineCtaRef = useRef<View>(null);

  const scrollViewHeightRef = useRef(0);

  const inlineCtaYRef = useRef(0);

  const inlineCtaHeightRef = useRef(0);

  const lastScrollYRef = useRef(0);

  const previousScrollYRef = useRef(0);

  const footerScrollVisibleRef = useRef(true);

  const dockModeRef = useRef<ProductDetailBottomDockMode>('footer');

  const [dockMode, setDockMode] = useState<ProductDetailBottomDockMode>('footer');

  const [bookingUi, setBookingUi] = useState<ServiceBookingUiState>(DEFAULT_BOOKING_UI);



  const measureInlineCtaPosition = useCallback(() => {

    const scrollContent = scrollContentRef.current;

    const inlineNode = inlineCtaRef.current;

    if (!scrollContent || !inlineNode) {

      return;

    }



    inlineNode.measureLayout(

      scrollContent,

      (_x, y, _width, height) => {

        inlineCtaYRef.current = y;

        inlineCtaHeightRef.current = height;

      },

      () => {},

    );

  }, []);



  const syncBottomDock = useCallback(

    (scrollY: number) => {

      const viewHeight = scrollViewHeightRef.current;

      const delta = scrollY - previousScrollYRef.current;

      previousScrollYRef.current = scrollY;

      lastScrollYRef.current = scrollY;



      if (scrollY <= 0) {

        footerScrollVisibleRef.current = true;

      } else if (delta > SCROLL_DELTA_THRESHOLD) {

        footerScrollVisibleRef.current = false;

      } else if (delta < -SCROLL_DELTA_THRESHOLD) {

        footerScrollVisibleRef.current = true;

      }



      const showFooterOnScroll = footerScrollVisibleRef.current;

      const inlineTop = inlineCtaYRef.current;

      const inlineBottom = inlineTop + inlineCtaHeightRef.current;

      const viewportTop = scrollY + spacing.sm;

      const viewportBottom = scrollY + viewHeight - footerInset - spacing.sm;



      const hasInlineMetrics = inlineCtaHeightRef.current > 0;

      const inlineAboveViewport = hasInlineMetrics && inlineBottom <= viewportTop;

      const inlineBelowViewport = hasInlineMetrics && inlineTop >= viewportBottom;

      const inlineInViewport =

        hasInlineMetrics && !inlineAboveViewport && !inlineBelowViewport;



      let nextMode: ProductDetailBottomDockMode;



      if (!hasInlineMetrics) {

        nextMode = scrollY <= AT_TOP_SCROLL_THRESHOLD ? 'footer' : 'cart';

      } else if (inlineInViewport) {

        nextMode = showFooterOnScroll ? 'footer' : 'hidden';

      } else if (scrollY <= AT_TOP_SCROLL_THRESHOLD) {

        nextMode = 'footer';

      } else {

        nextMode = 'cart';

      }



      if (nextMode === dockModeRef.current) {

        return;

      }



      dockModeRef.current = nextMode;

      setDockMode(nextMode);

    },

    [footerInset],

  );



  const handleScrollViewLayout = useCallback(

    (event: LayoutChangeEvent) => {

      scrollViewHeightRef.current = event.nativeEvent.layout.height;

      syncBottomDock(lastScrollYRef.current);

    },

    [syncBottomDock],

  );



  const handleInlineCtaLayout = useCallback(

    (_event: LayoutChangeEvent) => {

      measureInlineCtaPosition();

      requestAnimationFrame(() => {

        syncBottomDock(lastScrollYRef.current);

      });

    },

    [measureInlineCtaPosition, syncBottomDock],

  );



  const handleContentAboveInlineLayout = useCallback(

    (_event: LayoutChangeEvent) => {

      measureInlineCtaPosition();

      requestAnimationFrame(() => {

        syncBottomDock(lastScrollYRef.current);

      });

    },

    [measureInlineCtaPosition, syncBottomDock],

  );



  const handleScroll = useCallback(

    (event: NativeSyntheticEvent<NativeScrollEvent>) => {

      syncBottomDock(event.nativeEvent.contentOffset.y);

    },

    [syncBottomDock],

  );



  const resetBottomDock = useCallback(() => {

    dockModeRef.current = 'footer';

    setDockMode('footer');

    lastScrollYRef.current = 0;

    previousScrollYRef.current = 0;

    footerScrollVisibleRef.current = true;

    inlineCtaYRef.current = 0;

    inlineCtaHeightRef.current = 0;

  }, []);



  const { product, isRefreshing, error, retry } = useProductDetail(productId, serviceSlug);



  useLayoutEffect(() => {

    navigation.setOptions({ headerShown: false });

  }, [navigation]);



  useEffect(() => {

    if (!product || isServiceProduct(product)) {

      return;

    }

    const id = getProductRouteId(product);

    if (!id) {

      return;

    }

    navigation.replace('ProductDetail', {

      productId: id,

      slug: product.slug,

    });

  }, [navigation, product]);



  const service = isServiceProduct(product) ? product : null;

  const productRouteId = service ? getProductRouteId(service) : undefined;



  useEffect(() => {

    resetBottomDock();

    const frame = requestAnimationFrame(() => {

      measureInlineCtaPosition();

      syncBottomDock(0);

    });

    return () => {

      cancelAnimationFrame(frame);

    };

  }, [measureInlineCtaPosition, productRouteId, resetBottomDock, syncBottomDock]);



  const { sellerProducts, relatedProducts, recentlyViewedProducts } =

    useProductDetailRecommendations(service);



  const {

    averageRating,

    reviewAverages,

    reviewCount,

    reviews,

    isLoading: isReviewsLoading,

  } = useProductReviews(productRouteId);



  const galleryImages = useMemo(

    () => (service ? getProductGalleryImages(service) : []),

    [service],

  );



  const displayPricing = useMemo(

    () => (service ? getServiceDisplayPricing(service, userInfo) : null),

    [service, userInfo],

  );



  const sellerName = service ? getSellerDisplayName(service) : undefined;

  const sellerStoreSlug = service?.seller?.storeSlug?.trim();

  const sellerLogoUrl = service?.seller?.storeLogo || service?.seller?.userProfile;

  const sellerStorePolicy = service ? getSellerStorePolicy(service) : undefined;

  const showSellerPolicies = hasDisplayableStorePolicy(sellerStorePolicy);

  const showSellerMessage = canShowProductSellerMessage({

    seller: service?.seller,

    authUserId,

  });

  const productAuthReturnTo = useMemo(

    () => buildProductDetailAuthReturnTo(productRouteId, service?.slug),

    [productRouteId, service?.slug],

  );



  const handleVisitShop = useCallback(() => {

    if (sellerStoreSlug) {

      navigateToShop(navigation, sellerStoreSlug);

    }

  }, [navigation, sellerStoreSlug]);



  const handleSharePress = useCallback(() => {

    if (!service) {

      return;

    }



    const shareUrl = getProductShareUrl(service.slug, getProductRouteId(service));

    if (!shareUrl) {

      Alert.alert('Unable to share', 'This service does not have a shareable link yet.');

      return;

    }



    promptProductShare({

      title: getProductDisplayName(service),

      url: shareUrl,

    });

  }, [service]);



  const handleMessageSeller = useCallback(() => {

    openProductSellerChat({

      navigation,

      seller: service?.seller,

      isAuthenticated,

      returnTo: productAuthReturnTo,

    });

  }, [isAuthenticated, navigation, productAuthReturnTo, service?.seller]);



  const handleRecommendationPress = useCallback(

    (item: Product) => {

      navigateToCatalogListing(navigation, item);

    },

    [navigation],

  );



  const onAddToCart = useCallback(

    async (hold: ServiceSlotSelectionHold) => {

      if (!service) {

        return;

      }

      await addServiceAppointment(hold, service);

    },

    [addServiceAppointment, service],

  );



  const handleBookingStateChange = useCallback((state: ServiceBookingUiState) => {

    setBookingUi(state);

  }, []);



  const ctaMode: ProductDetailAddToCartCtaMode = bookingUi.submitting ? 'loading' : 'add';

  const ctaLabel = bookingUi.addButtonLabel;

  const handleCtaPress = useCallback(async () => {

    await bookingRef.current?.submitAddToCart();

  }, []);



  const dockButtonDisabled = !bookingUi.canSubmit || bookingUi.submitting;

  const floatingCtaActive = dockMode === 'cart';

  const contentPaddingBottom = footerInset + spacing.xl;

  const bookingNoticeIsError =

    bookingUi.notice != null && !/added to cart/i.test(bookingUi.notice);



  if (error && !service && !isRefreshing) {

    return (

      <View style={[styles.centeredState, { backgroundColor: theme.background }]}>

        <HeaderBackButton onPress={() => navigation.goBack()} color={theme.textPrimary} />

        <AppText variant="bodySmall" color="error">

          {error ?? 'Service not found.'}

        </AppText>

        <Pressable style={styles.retryButton} onPress={() => void retry()}>

          <AppText variant="button" color="textPrimary">

            Try again

          </AppText>

        </Pressable>

        <Pressable onPress={() => navigation.goBack()}>

          <AppText variant="bodyMedium" color="textPrimary">

            Go back

          </AppText>

        </Pressable>

      </View>

    );

  }



  const servicePriceLabel =

    displayPricing && service

      ? formatServicePriceLabel(displayPricing.currencyLabel, displayPricing.displayPrice, {

          prefix: displayPricing.pricePrefix,

        })

      : undefined;



  return (

    <FadeInContent style={styles.screen}>

      <View style={[styles.screenInner, { backgroundColor: theme.background }]}>

        {error && service ? (

          <Pressable style={styles.refreshBanner} onPress={() => void retry()}>

            <AppText variant="bodySmall" color="error">

              {error}

            </AppText>

            <AppText variant="bodySmall" style={styles.refreshBannerAction}>

              Retry

            </AppText>

          </Pressable>

        ) : null}



        <ScrollView

          style={styles.scroll}

          contentContainerStyle={styles.container}

          showsVerticalScrollIndicator={false}

          onLayout={handleScrollViewLayout}

          onScroll={handleScroll}

          onContentSizeChange={() => {

            measureInlineCtaPosition();

            syncBottomDock(lastScrollYRef.current);

          }}

          scrollEventThrottle={16}

        >

          <View ref={scrollContentRef} collapsable={false} style={styles.scrollContent}>

            <ProductGallery

              images={galleryImages}

              productName={service ? getProductDisplayName(service) : ''}

              theme={theme}

              chrome={

                service

                  ? {

                      onBackPress: () => navigation.goBack(),

                      onMessagePress: showSellerMessage ? handleMessageSeller : undefined,

                      onSharePress: handleSharePress,

                    }

                  : null

              }

            />



            <View

              style={[

                styles.contentSheet,

                {

                  backgroundColor: theme.surface,

                  paddingBottom: contentPaddingBottom,

                },

              ]}

            >

              <View style={styles.contentAboveInline} onLayout={handleContentAboveInlineLayout}>

              <ProductDetailHeader

                productName={service ? getProductDisplayName(service) : ''}

                averageRating={averageRating}

                reviewCount={reviewCount}

                productType="Service"

                theme={theme}

                availabilityLabel={service ? buildServiceAvailabilityLabel(service) : undefined}

                priceLabel={servicePriceLabel}

              />



              {service ? (

                <ServiceBookingPanel

                  ref={bookingRef}

                  service={service}

                  cart={cart}

                  onAddToCart={onAddToCart}

                  showPriceSummary={false}

                  theme={theme}

                  onBookingStateChange={handleBookingStateChange}

                />

              ) : null}

              </View>



              <View

                ref={inlineCtaRef}

                collapsable={false}

                style={styles.inlineCtaSection}

                onLayout={handleInlineCtaLayout}

              >

                {bookingUi.notice && !floatingCtaActive ? (

                  <AppText variant="bodySmall" style={{ color: theme.textMuted }}>

                    {bookingUi.notice}

                  </AppText>

                ) : null}

                <View

                  style={floatingCtaActive ? styles.inlineCtaGhost : undefined}

                  pointerEvents={floatingCtaActive ? 'none' : 'auto'}

                >

                  <ProductDetailAddToCartCta

                    theme={theme}

                    buttonLabel={ctaLabel}

                    disabled={dockButtonDisabled}

                    mode={ctaMode}

                    onPress={() => void handleCtaPress()}

                  />

                </View>

              </View>



              <ProductDetailReviewsSection

                averageRating={averageRating}

                reviewAverages={reviewAverages}

                reviewCount={reviewCount}

                reviews={reviews}

                isLoading={isReviewsLoading}

                theme={theme}

                reviewsKind="service"

              />



              {service ? (

                <ProductDetailItemDetailsSection product={service} theme={theme} />

              ) : null}



              {showSellerPolicies && sellerStorePolicy ? (

                <ProductDetailPoliciesSection policy={sellerStorePolicy} theme={theme} />

              ) : null}



              {sellerName ? (

                <ProductMeetSellerSection

                  sellerName={sellerName}

                  sellerLogoUrl={sellerLogoUrl}

                  theme={theme}

                  onVisitShop={sellerStoreSlug ? handleVisitShop : undefined}

                  onMessageSeller={showSellerMessage ? handleMessageSeller : undefined}

                />

              ) : null}



              <SuggestedProductsSection

                embedded

                title="More from this seller"

                products={sellerProducts}

                onProductPress={handleRecommendationPress}

                showSeller={false}

              />

              <SuggestedProductsSection

                embedded

                title="Recently viewed"

                products={recentlyViewedProducts}

                onProductPress={handleRecommendationPress}

                showSeller={false}

              />

              <SuggestedProductsSection

                embedded

                title="You may also like"

                products={relatedProducts}

                onProductPress={handleRecommendationPress}

              />

            </View>

          </View>

        </ScrollView>



        <ProductDetailBottomDock

          mode={dockMode}

          theme={theme}

          buttonLabel={ctaLabel}

          disabled={dockButtonDisabled}

          ctaMode={ctaMode}

          onPress={() => void handleCtaPress()}

          errorMessage={dockMode === 'cart' && bookingNoticeIsError ? bookingUi.notice : null}

        />

      </View>

    </FadeInContent>

  );

}



const styles = StyleSheet.create({

  screen: {

    flex: 1,

  },

  screenInner: {

    flex: 1,

    position: 'relative',

  },

  scrollContent: {

    flexGrow: 1,

  },

  scroll: {

    flex: 1,

  },

  container: {

    flexGrow: 1,

  },

  contentSheet: {

    marginTop: -CONTENT_SHEET_OVERLAP,

    borderTopLeftRadius: 28,

    borderTopRightRadius: 28,

    paddingHorizontal: spacing.lg,

    paddingTop: spacing.md,

    gap: spacing.md,

    flexGrow: 1,

  },

  contentAboveInline: {

    gap: spacing.md,

  },

  inlineCtaSection: {

    gap: spacing.sm,

  },

  inlineCtaGhost: {

    opacity: 0,

  },

  centeredState: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    padding: spacing.xl,

    gap: spacing.md,

  },

  refreshBanner: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: spacing.sm,

    marginHorizontal: spacing.lg,

    marginBottom: spacing.sm,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    borderRadius: 12,

    backgroundColor: colors.surfaceMuted,

  },

  refreshBannerAction: {

    color: colors.textPrimary,

    fontWeight: '600',

  },

  retryButton: {

    borderRadius: 8,

    paddingVertical: spacing.sm,

    paddingHorizontal: spacing.lg,

    backgroundColor: colors.surfaceWhite,

    borderWidth: 1,

    borderColor: colors.borderForm,

  },

});


