import { useCallback, useMemo } from 'react';
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

import { EmptyState } from '../../../../components/ecommerce/EmptyState';
import { ErrorState } from '../../../../components/ecommerce/ErrorState';
import { AppCard } from '../../../../components/ui/AppCard';
import { AppText } from '../../../../components/ui/AppText';
import { colors, radius, shadows, spacing } from '../../../../design-system';
import type { AdminStackParamList } from '../../navigation/adminTypes';
import { useRequireAdmin } from '../../hooks/useRequireAdmin';
import { authReturnTo } from '../../../auth/utils/authNavigation';
import { OrderListSearchBar } from '../../../orders/components/OrderListSearchBar';
import { AdminProductCard } from '../components/AdminProductCard';
import { AdminProductCardActionsMenu } from '../components/AdminProductCardActionsMenu';
import { AdminProductCardSkeleton } from '../components/AdminProductCardSkeleton';
import { AdminProductFilterTabs } from '../components/AdminProductFilterTabs';
import { useAdminProductCardActions } from '../hooks/useAdminProductCardActions';
import { useAdminProductList } from '../hooks/useAdminProductList';
import type { AdminProductListItem } from '../types/adminProductManagement';
import { ADMIN_LOW_STOCK_THRESHOLD } from '../types/adminProductManagement';
import {
  openAdminAddProductFlow,
  openAdminAddServiceFlow,
} from '../utils/adminListingHubNavigation';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminProductManagement'>;

const LIST_RETURN_TO = authReturnTo.adminProductManagement();
const SKELETON_ITEMS = ['s1', 's2', 's3'] as const;

export function AdminProductManagementScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthorized } = useRequireAdmin(LIST_RETURN_TO);

  const lockedListingKind = route.params?.listingKind;
  const isServiceList = lockedListingKind === 'services';
  const isProductList = lockedListingKind === 'products';

  const initialFilters = useMemo(
    () => ({
      listingKind: route.params?.listingKind,
      initialApprovalFilter: route.params?.initialApprovalFilter,
      initialInventoryFilter: route.params?.initialInventoryFilter,
      initialStockAlertFilter: route.params?.initialStockAlertFilter,
    }),
    [
      route.params?.listingKind,
      route.params?.initialApprovalFilter,
      route.params?.initialInventoryFilter,
      route.params?.initialStockAlertFilter,
    ],
  );

  const handleCreateListing = useCallback(() => {
    if (isServiceList) {
      openAdminAddServiceFlow(navigation);
      return;
    }
    openAdminAddProductFlow(navigation);
  }, [isServiceList, navigation]);

  const {
    products,
    currentPage,
    totalPages,
    totalProducts,
    isLoading,
    isRefreshing,
    error,
    searchInput,
    setSearchInput,
    approvalFilter,
    inventoryFilter,
    stockAlertFilter,
    hasActiveFilters,
    applyApprovalFilter,
    applyInventoryFilter,
    applyStockAlertFilter,
    clearFilters,
    refresh,
    goToPreviousPage,
    goToNextPage,
    canGoPrevious,
    canGoNext,
  } = useAdminProductList(isAuthorized, initialFilters);

  useFocusEffect(
    useCallback(() => {
      const nextFilter = route.params?.initialStockAlertFilter;
      if (!nextFilter) {
        return;
      }

      applyStockAlertFilter(nextFilter);
      applyApprovalFilter('');
      applyInventoryFilter('');
    }, [
      applyApprovalFilter,
      applyInventoryFilter,
      applyStockAlertFilter,
      route.params?.initialStockAlertFilter,
      route.params?.stockAlertRequestedAt,
    ]),
  );

  const handleClearStockAlert = useCallback(() => {
    applyStockAlertFilter('');
    navigation.setParams({
      initialStockAlertFilter: undefined,
      initialListNotice: undefined,
    });
  }, [applyStockAlertFilter, navigation]);

  const {
    menuProduct,
    menuActions,
    openMenu,
    closeMenu,
    handleMenuAction,
    handleView,
    busyProductId,
  } = useAdminProductCardActions(navigation, () => {
    void refresh();
  });

  const showSkeletonList = isLoading && products.length === 0 && !error;

  const handleTabSelect = useCallback(
    (approval: typeof approvalFilter, inventory: typeof inventoryFilter) => {
      applyStockAlertFilter('');
      applyApprovalFilter(approval);
      applyInventoryFilter(inventory);
      navigation.setParams({
        initialStockAlertFilter: undefined,
        initialListNotice: undefined,
      });
    },
    [applyApprovalFilter, applyInventoryFilter, applyStockAlertFilter, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminProductListItem }) => (
      <AdminProductCard
        product={item}
        onPress={handleView}
        onMenuPress={openMenu}
        isBusy={Boolean(item._id && busyProductId === item._id)}
      />
    ),
    [busyProductId, handleView, openMenu],
  );

  const listNotice = stockAlertFilter ? route.params?.initialListNotice?.trim() : undefined;
  const stockAlertTitle =
    stockAlertFilter === 'outOfStock'
      ? 'Out of stock products'
      : stockAlertFilter === 'lowStock'
        ? `Low stock products (under ${ADMIN_LOW_STOCK_THRESHOLD} units)`
        : null;

  const listHeader = (
    <View style={styles.headerContent}>
      {stockAlertTitle && listNotice ? (
        <AppCard variant="flat" style={styles.listNoticeCard}>
          <View style={styles.listNoticeHeader}>
            <AppText variant="bodyMedium" style={styles.listNoticeTitle}>
              {stockAlertTitle}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={handleClearStockAlert}
              hitSlop={8}
            >
              <AppText variant="caption" color="textLink" style={styles.listNoticeAction}>
                View all
              </AppText>
            </Pressable>
          </View>
          <AppText variant="bodySmall" color="textSecondary">
            {listNotice}
          </AppText>
        </AppCard>
      ) : null}

      <OrderListSearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder={
          isServiceList
            ? 'Search by service name, seller...'
            : 'Search by product name, seller...'
        }
        accessibilityLabel={
          isServiceList
            ? 'Search services by name or seller'
            : 'Search products by name or seller'
        }
      />

      <AdminProductFilterTabs
        approvalFilter={approvalFilter}
        inventoryFilter={inventoryFilter}
        onSelect={handleTabSelect}
      />

      {!lockedListingKind ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('AdminServiceTeamsSettings')}
          style={styles.serviceTeamsLink}
        >
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <AppText variant="bodySmall" color="textLink">
            Service hours & teams
          </AppText>
        </Pressable>
      ) : null}

      {totalProducts > 0 ? (
        <AppText variant="bodySmall" color="textSecondary" style={styles.countText}>
          {totalProducts}{' '}
          {isServiceList
            ? totalProducts === 1
              ? 'service'
              : 'services'
            : totalProducts === 1
              ? 'product'
              : 'products'}
        </AppText>
      ) : null}

      {error && products.length === 0 && !showSkeletonList ? (
        <ErrorState message={error} onAction={() => void refresh()} style={styles.inlineError} />
      ) : null}

      {error && products.length > 0 ? (
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
    products.length > 0 ? (
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
            { paddingBottom: insets.bottom + spacing.xxl + 72 },
          ]}
          data={SKELETON_ITEMS}
          keyExtractor={(item) => item}
          renderItem={() => <AdminProductCardSkeleton />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isServiceList ? 'Add service' : 'Add product'}
          onPress={handleCreateListing}
          style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </Pressable>
      </>
    );
  }

  const emptyTitle = isServiceList
    ? hasActiveFilters || searchInput.trim()
      ? 'No matching services'
      : 'No services yet'
    : hasActiveFilters || searchInput.trim()
      ? 'No matching products'
      : 'No products found';

  const emptyMessage = isServiceList
    ? hasActiveFilters || searchInput.trim()
      ? 'Try adjusting your search or status tab.'
      : 'Platform services will appear here once sellers publish them.'
    : hasActiveFilters || searchInput.trim()
      ? stockAlertFilter
        ? 'No products match this inventory alert right now.'
        : 'Try adjusting your search or status tab.'
      : isProductList
        ? 'Platform products will appear here once sellers add inventory.'
        : 'Platform products will appear here once sellers add inventory.';

  return (
    <>
      <FlatList
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl + 72 },
          products.length === 0 && styles.emptyContent,
        ]}
        data={products}
        keyExtractor={(item, index) => item._id ?? `admin-product-${index}`}
        renderItem={renderItem}
        extraData={busyProductId}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState title={emptyTitle} message={emptyMessage} />
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isServiceList ? 'Add service' : 'Add product'}
        onPress={handleCreateListing}
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </Pressable>

      <AdminProductCardActionsMenu
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
  listNoticeCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  listNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  listNoticeTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  listNoticeAction: {
    fontWeight: '600',
  },
  countText: {
    fontWeight: '600',
  },
  serviceTeamsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
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
