import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SectionHeader } from '../../../components/ecommerce';
import {
  marketplaceScrollProps,
  useMarketplaceFooterContentInset,
  useMarketplaceScrollHandler,
} from '../../../app/navigation/marketplaceChrome';
import { colors, sectionGap, spacing } from '../../../design-system';
import type { MainTabParamList, ShoppingStackParamList } from '../../../app/navigation/types';
import { navigateToShop } from '../../../app/navigation/shoppingNavigation';
import type { Product } from '../../../services/types/product';
import type { Seller } from '../../../services/types/seller';
import { getProductImageUrl } from '../../products/utils/productDisplay';
import { navigateToCatalogListing } from '../../services/utils/serviceDetailNavigation';
import { HomeFeaturedSellersSection } from './HomeFeaturedSellersSection';
import { HomeProductSection } from './HomeProductSection';
import { HomePromoCarousel } from './HomePromoCarousel';
import {
  HOME_TEAM_PICKS_MAX,
  HOME_TRENDING_MAX,
  useHomeCollections,
} from '../hooks/useHomeCollections';
import { useFeaturedSellers } from '../hooks/useFeaturedSellers';
import { useNewArrivalProducts } from '../hooks/useNewArrivalProducts';
import { consumeMarketplaceHomeRefreshRequest } from '../state/marketplaceHomeRefresh';

export type HomeMarketplaceNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'MarketplaceTab'>,
  NativeStackNavigationProp<ShoppingStackParamList>
>;

export interface HomeMarketplaceContentProps {
  navigation: HomeMarketplaceNavigationProp;
}

export function HomeMarketplaceContent({ navigation }: HomeMarketplaceContentProps) {
  const footerInset = useMarketplaceFooterContentInset();
  const onMarketplaceScroll = useMarketplaceScrollHandler();
  const {
    products: newArrivals,
    isLoading: isNewArrivalsLoading,
    error: newArrivalsError,
    retry: retryNewArrivals,
  } = useNewArrivalProducts(8);
  const {
    trending,
    teamPicks,
    isLoading: isCollectionsLoading,
    error: collectionsError,
    retry: retryCollections,
  } = useHomeCollections();
  // Trending shows while loading / on error (spinner-free, error panel with retry); Team Picks
  // only when the admin has picked products.
  const showTrending = trending.length > 0 || (!isCollectionsLoading && Boolean(collectionsError));
  const showTeamPicks = teamPicks.length > 0;
  const {
    sellers: featuredSellers,
    isLoading: isFeaturedSellersLoading,
    error: featuredSellersError,
    retry: retryFeaturedSellers,
  } = useFeaturedSellers();

  const refreshHomeMarketplaceData = useCallback(() => {
    void retryFeaturedSellers();
    void retryNewArrivals();
    void retryCollections();
  }, [retryCollections, retryFeaturedSellers, retryNewArrivals]);

  useFocusEffect(
    useCallback(() => {
      if (consumeMarketplaceHomeRefreshRequest()) {
        refreshHomeMarketplaceData();
      }
    }, [refreshHomeMarketplaceData]),
  );

  const promoSlides = useMemo(() => {
    const slides = [
      {
        id: 'shipping-promo',
        title: 'Save on shipping across the marketplace',
        subtitle: 'Discover artisan finds from independent sellers',
        imageUrl: newArrivals[0] ? getProductImageUrl(newArrivals[0]) : undefined,
      },
      {
        id: 'new-arrivals-promo',
        title: 'Shop the latest new arrivals',
        subtitle: 'Fresh products added this week',
        imageUrl: newArrivals[1] ? getProductImageUrl(newArrivals[1]) : undefined,
      },
    ];

    return slides.filter((slide) => slide.title);
  }, [newArrivals]);

  const handleProductPress = (product: Product) => {
    navigateToCatalogListing(navigation, product);
  };

  const handlePromoPress = () => {
    navigation.navigate('ProductListing', {
      title: 'New Arrivals',
      listingSource: 'newArrival',
    });
  };

  const handleSellerPress = (seller: Seller) => {
    if (seller.storeSlug?.trim()) {
      navigateToShop(navigation, seller.storeSlug);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl + footerInset }]}
      showsVerticalScrollIndicator={false}
      directionalLockEnabled
      nestedScrollEnabled
      onScroll={onMarketplaceScroll}
      {...marketplaceScrollProps}
    >
      <HomePromoCarousel slides={promoSlides} onPress={handlePromoPress} />

      <View style={styles.section}>
        <SectionHeader title="Featured Shops" />
        <HomeFeaturedSellersSection
          sellers={featuredSellers}
          isLoading={isFeaturedSellersLoading}
          error={featuredSellersError}
          onRetry={retryFeaturedSellers}
          onSellerPress={handleSellerPress}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="New Arrivals"
          actionLabel="See All"
          onActionPress={() =>
            navigation.navigate('ProductListing', {
              title: 'New Arrivals',
              listingSource: 'newArrival',
            })
          }
        />
        <HomeProductSection
          products={newArrivals}
          isLoading={isNewArrivalsLoading}
          error={newArrivalsError}
          onRetry={retryNewArrivals}
          onProductPress={handleProductPress}
          layout="pair"
          maxItems={4}
        />
      </View>

      {showTrending ? (
        <View style={styles.section}>
          <SectionHeader title="Trending Now" />
          <HomeProductSection
            products={trending}
            isLoading={isCollectionsLoading}
            error={collectionsError}
            onRetry={retryCollections}
            onProductPress={handleProductPress}
            layout="horizontal"
            maxItems={HOME_TRENDING_MAX}
          />
        </View>
      ) : null}

      {/* Admin's hand-picked list; hidden while empty. */}
      {showTeamPicks ? (
        <View style={styles.section}>
          <SectionHeader title="AFOMA Team Picks" />
          <HomeProductSection
            products={teamPicks}
            isLoading={false}
            error={null}
            onRetry={retryCollections}
            onProductPress={handleProductPress}
            layout="horizontal"
            maxItems={HOME_TEAM_PICKS_MAX}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: sectionGap,
  },
});
