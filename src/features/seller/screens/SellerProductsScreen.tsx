import { useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../../components/ecommerce/EmptyState';
import { ErrorState } from '../../../components/ecommerce/ErrorState';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../design-system';
import type { SellerStackParamList } from '../../../app/navigation/sellerTypes';
import type { Product } from '../../../services/types/product';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { SellerSetupProgress } from '../components/SellerSetupProgress';
import { useRequireSeller } from '../hooks/useRequireSeller';
import { useSellerProfile } from '../hooks/useSellerProfile';
import { AdminProductCardSkeleton } from '../../admin/product-management/components/AdminProductCardSkeleton';
import { OrderListSearchBar } from '../../orders/components/OrderListSearchBar';
import { SellerProductCard } from '../products/components/SellerProductCard';
import { SellerProductCardActionsMenu } from '../products/components/SellerProductCardActionsMenu';
import { SellerProductFilterTabs } from '../products/components/SellerProductFilterTabs';
import { useSellerProductCardActions } from '../products/hooks/useSellerProductCardActions';
import { useSellerProducts } from '../products/hooks/useSellerProducts';
import {
  openSellerAddProductFlow,
  openSellerAddServiceFlow,
  openSellerProductTypeSelection,
} from '../products/utils/sellerProductCreationNavigation';
import { canSellerCreateProducts, SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE } from '../utils/sellerProductGate';
import {
  isSellerSetupFlowComplete,
} from '../utils/sellerSetupSections';
import { navigateToSellerSetupHub } from '../utils/sellerSetupNavigation';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerProducts'>;

const PRODUCTS_RETURN_TO = authReturnTo.sellerProducts();
const SKELETON_ITEMS = ['s1', 's2', 's3'] as const;

export function SellerProductsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthorized, sellerId } = useRequireSeller(PRODUCTS_RETURN_TO);
  const { profile } = useSellerProfile(isAuthorized ? sellerId : undefined);

  const {
    products,
    pageProducts,
    totalProducts,
    currentPage,
    totalPages,
    isLoading,
    isRefreshing,
    error,
    searchInput,
    setSearchInput,
    approvalFilter,
    inventoryFilter,
    hasActiveFilters,
    applyApprovalFilter,
    applyInventoryFilter,
    listingKind,
    setListingKind,
    refresh,
    goToPreviousPage,
    goToNextPage,
    canGoPrevious,
    canGoNext,
  } = useSellerProducts(isAuthorized ? sellerId : undefined, route.params?.listingKind ?? 'all');

  const lockedListingKind = route.params?.listingKind;
  const listContext: 'all' | 'products' | 'services' = lockedListingKind ?? listingKind;
  const isServiceList = listContext === 'services';
  const isProductList = listContext === 'products';
  const showListingKindTabs = !lockedListingKind;

  useEffect(() => {
    if (lockedListingKind) {
      setListingKind(lockedListingKind);
    }
  }, [lockedListingKind, setListingKind]);

  const {
    menuProduct,
    menuActions,
    openMenu,
    closeMenu,
    handleMenuAction,
    handleEdit,
    busyProductId,
  } = useSellerProductCardActions(navigation, () => {
    void refresh();
  });

  const setupComplete = isSellerSetupFlowComplete(profile?.profileSetup, profile);
  const canCreate = canSellerCreateProducts(profile);
  const showSkeletonList = isLoading && pageProducts.length === 0 && !error;

  useFocusEffect(
    useCallback(() => {
      if (isAuthorized && sellerId) {
        void refresh();
      }
    }, [isAuthorized, refresh, sellerId]),
  );

  const handleContinueSetup = () => {
    navigateToSellerSetupHub(navigation);
  };

  const handleCreateProduct = () => {
    if (listContext === 'services') {
      void openSellerAddServiceFlow(navigation, profile, sellerId);
      return;
    }

    if (listContext === 'products') {
      openSellerAddProductFlow(navigation, profile);
      return;
    }

    openSellerProductTypeSelection(navigation, profile);
  };

  const handleTabSelect = useCallback(
    (approval: typeof approvalFilter, inventory: typeof inventoryFilter) => {
      applyApprovalFilter(approval);
      applyInventoryFilter(inventory);
    },
    [applyApprovalFilter, applyInventoryFilter],
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <SellerProductCard
        product={item}
        onPress={handleEdit}
        onMenuPress={openMenu}
        isBusy={Boolean(item._id && busyProductId === item._id)}
      />
    ),
    [busyProductId, handleEdit, openMenu],
  );

  const setupBanner = !setupComplete ? (
    <AppCard variant="flat">
      <SellerSetupProgress profile={profile} profileSetup={profile?.profileSetup} onContinue={handleContinueSetup} />
    </AppCard>
  ) : null;

  const countLabel = useMemo(() => {
    if (totalProducts <= 0) {
      return null;
    }

    const noun = isServiceList ? 'service' : isProductList ? 'product' : 'listing';
    const nounPlural = isServiceList ? 'services' : isProductList ? 'products' : 'listings';

    if (hasActiveFilters) {
      return `${products.length} on this page · ${totalProducts} total ${nounPlural}`;
    }

    return `${totalProducts} ${totalProducts === 1 ? noun : nounPlural}`;
  }, [hasActiveFilters, isProductList, isServiceList, products.length, totalProducts]);

  const listHeader = (
    <View style={styles.headerContent}>
      {setupBanner}

      <OrderListSearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder={
          isServiceList
            ? 'Search by service name...'
            : isProductList
              ? 'Search by product name...'
              : 'Search listings...'
        }
        accessibilityLabel={
          isServiceList
            ? 'Search services by name'
            : isProductList
              ? 'Search products by name'
              : 'Search listings by name'
        }
      />

      <SellerProductFilterTabs
        approvalFilter={approvalFilter}
        inventoryFilter={inventoryFilter}
        onSelect={handleTabSelect}
      />

      {showListingKindTabs ? (
        <View style={styles.kindRow}>
          {(['all', 'products', 'services'] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => setListingKind(kind)}
              style={[styles.kindChip, listingKind === kind && styles.kindChipActive]}
            >
              <AppText variant="caption" color={listingKind === kind ? 'textLink' : 'textMuted'}>
                {kind === 'all' ? 'All listings' : kind === 'products' ? 'Products' : 'Services'}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {countLabel ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.countText}>
          {countLabel}
        </AppText>
      ) : null}

      {!canCreate ? (
        <AppText variant="caption" color="textMuted">
          {SELLER_PRODUCT_CREATION_BLOCKED_MESSAGE}
        </AppText>
      ) : null}

      {error && pageProducts.length === 0 && !showSkeletonList ? (
        <ErrorState message={error} onAction={() => void refresh()} style={styles.inlineError} />
      ) : null}

      {error && pageProducts.length > 0 ? (
        <ErrorState
          message={error}
          actionLabel="Retry"
          onAction={() => void refresh()}
          style={styles.inlineError}
        />
      ) : null}
    </View>
  );

  const listFooter =
    pageProducts.length > 0 ? (
      <View style={styles.pagination}>
        <Pressable
          accessibilityRole="button"
          onPress={goToPreviousPage}
          disabled={!canGoPrevious}
          style={[styles.paginationButton, !canGoPrevious && styles.paginationButtonDisabled]}
        >
          <AppText variant="bodySmall" color={canGoPrevious ? 'textLink' : 'textMuted'}>
            Previous
          </AppText>
        </Pressable>

        <AppText variant="bodySmall" color="textSecondary">
          Page {currentPage} of {totalPages}
        </AppText>

        <Pressable
          accessibilityRole="button"
          onPress={goToNextPage}
          disabled={!canGoNext}
          style={[styles.paginationButton, !canGoNext && styles.paginationButtonDisabled]}
        >
          <AppText variant="bodySmall" color={canGoNext ? 'textLink' : 'textMuted'}>
            Next
          </AppText>
        </Pressable>
      </View>
    ) : null;

  const emptyTitle = hasActiveFilters
    ? isServiceList
      ? 'No matching services'
      : isProductList
        ? 'No matching products'
        : 'No matching listings'
    : isServiceList
      ? 'No services yet'
      : isProductList
        ? 'No products yet'
        : 'No listings yet';

  const emptyMessage = hasActiveFilters || searchInput.trim()
    ? isServiceList
      ? 'Try a different search or clear the status filters.'
      : 'Try adjusting your search or status tab on this page.'
    : isServiceList
      ? canCreate
        ? 'Add your first bookable service. Customers will see it after review.'
        : 'Complete shop setup to start adding services.'
      : canCreate
        ? 'Start building your inventory by adding your first product.'
        : 'Complete shop setup to start adding products.';

  const emptyActionLabel = !hasActiveFilters
    ? isServiceList
      ? canCreate
        ? 'Add service'
        : 'Continue setup'
      : canCreate
        ? 'Add product'
        : 'Continue setup'
    : undefined;

  const fab = canCreate ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isServiceList ? 'Add service' : 'Add listing'}
      onPress={handleCreateProduct}
      style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
    >
      <Ionicons name="add" size={28} color={colors.textInverse} />
    </Pressable>
  ) : null;

  if (!isAuthorized) {
    return <View style={[styles.screen, { paddingTop: insets.top }]} />;
  }

  if (showSkeletonList) {
    return (
      <>
        <FlatList
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl + (canCreate ? 72 : 0) },
          ]}
          data={SKELETON_ITEMS}
          keyExtractor={(item) => item}
          renderItem={() => <AdminProductCardSkeleton />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
        {fab}
      </>
    );
  }

  return (
    <>
      <FlatList
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl + (canCreate ? 72 : 0) },
          products.length === 0 && pageProducts.length === 0 && styles.emptyContent,
        ]}
        data={products}
        keyExtractor={(item, index) => item._id ?? `seller-product-${index}`}
        renderItem={renderItem}
        extraData={busyProductId}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState
              title={emptyTitle}
              message={emptyMessage}
              actionLabel={emptyActionLabel}
              onAction={
                !hasActiveFilters
                  ? canCreate
                    ? handleCreateProduct
                    : handleContinueSetup
                  : undefined
              }
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {fab}

      <SellerProductCardActionsMenu
        visible={Boolean(menuProduct)}
        productName={menuProduct?.productName?.trim() || 'Untitled product'}
        actions={menuActions}
        onClose={closeMenu}
        onSelect={handleMenuAction}
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
    gap: spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
  },
  headerContent: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  countText: {
    fontWeight: '600',
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kindChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  inlineError: {
    alignSelf: 'stretch',
    marginHorizontal: 0,
  },
  separator: {
    height: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
  },
  paginationButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
