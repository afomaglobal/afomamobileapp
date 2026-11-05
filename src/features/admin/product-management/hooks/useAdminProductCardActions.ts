import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getErrorMessage } from '../../../../services/api/errors';
import type { AdminStackParamList } from '../../navigation/adminTypes';
import {
  deleteAdminProduct,
  updateAdminProductApprovalStatus,
  updateAdminProductsStoreVisibility,
} from '../api/adminProductManagementApi';
import type { AdminProductCardActionId } from '../components/AdminProductCardActionsMenu';
import type { AdminProductListItem } from '../types/adminProductManagement';
import type { AdminProductApprovalStatus } from '../types/adminProductOperations';
import {
  buildAdminProductApprovalActions,
  buildAdminProductCardActions,
} from '../utils/adminProductCardActions';
import { getAdminDuplicateValidationMessage, validateAdminProductDuplicatable } from '../utils/adminProductDuplicatePayload';
import { navigateToAdminProductMobilePreview } from '../utils/adminProductPreviewNavigation';
import {
  navigateToAdminDuplicatedProductEdit,
  navigateToAdminProductEdit,
} from '../utils/adminProductWriteNavigation';
import { useAdminDuplicateProduct } from './useAdminDuplicateProduct';
import { requestAdminProductListRefresh } from '../state/adminProductListRefresh';
import {
  clearAdminProductSessionPatch,
  setAdminProductSessionPatch,
} from '../state/adminProductSessionPatch';
import {
  patchAdminProductApproval,
  toAdminProductListPatch,
} from '../utils/adminProductOperations';

type AdminNavigation = NativeStackNavigationProp<AdminStackParamList>;

export function useAdminProductCardActions(
  navigation: AdminNavigation,
  onListChanged: () => void,
) {
  const [menuProduct, setMenuProduct] = useState<AdminProductListItem | null>(null);
  const [approvalMenuProduct, setApprovalMenuProduct] = useState<AdminProductListItem | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const { duplicateProduct, isDuplicating } = useAdminDuplicateProduct();

  const openMenu = useCallback((product: AdminProductListItem) => {
    setMenuProduct(product);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuProduct(null);
  }, []);

  const closeApprovalMenu = useCallback(() => {
    setApprovalMenuProduct(null);
  }, []);

  const runWithBusy = useCallback(
    async (productId: string, task: () => Promise<void>) => {
      setBusyProductId(productId);
      try {
        await task();
      } finally {
        setBusyProductId(null);
      }
    },
    [],
  );

  const handleView = useCallback(
    (product: AdminProductListItem) => {
      if (!product._id) {
        return;
      }

      navigation.navigate('AdminProductDetail', {
        productId: product._id,
        productType: product.productType,
        initialProduct: product,
      });
    },
    [navigation],
  );

  const handleEdit = useCallback(
    (product: AdminProductListItem) => {
      navigateToAdminProductEdit(navigation, product);
    },
    [navigation],
  );

  const handlePreview = useCallback(
    (product: AdminProductListItem) => {
      if (!navigateToAdminProductMobilePreview(navigation, product)) {
        Alert.alert('Preview unavailable', 'This product cannot be opened in the mobile storefront yet.');
      }
    },
    [navigation],
  );

  const handleDisable = useCallback(
    (product: AdminProductListItem, nextStatus: 0 | 1) => {
      const productId = product._id;
      if (!productId) {
        return;
      }

      void runWithBusy(productId, async () => {
        try {
          await updateAdminProductsStoreVisibility([productId], nextStatus);
          requestAdminProductListRefresh();
          onListChanged();
        } catch (err) {
          Alert.alert('Update failed', getErrorMessage(err, 'Failed to update product visibility'));
        }
      });
    },
    [onListChanged, runWithBusy],
  );

  const handleApprovalStatusChange = useCallback(
    (product: AdminProductListItem, productStatus: AdminProductApprovalStatus) => {
      const productId = product._id;
      if (!productId || product.productStatus === productStatus) {
        return;
      }

      void runWithBusy(productId, async () => {
        try {
          await updateAdminProductApprovalStatus(productId, productStatus);
          const updatedProduct = patchAdminProductApproval(product, productStatus);
          setAdminProductSessionPatch(productId, toAdminProductListPatch(updatedProduct));
          requestAdminProductListRefresh();
          onListChanged();
        } catch (err) {
          Alert.alert(
            'Update failed',
            getErrorMessage(err, 'Failed to update product approval status'),
          );
        }
      });
    },
    [onListChanged, runWithBusy],
  );

  const handleDelete = useCallback(
    (product: AdminProductListItem) => {
      const productId = product._id;
      if (!productId) {
        return;
      }

      Alert.alert(
        'Delete product?',
        'This permanently removes the product. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void runWithBusy(productId, async () => {
                try {
                  await deleteAdminProduct(productId);
                  clearAdminProductSessionPatch(productId);
                  requestAdminProductListRefresh();
                  onListChanged();
                } catch (err) {
                  Alert.alert('Delete failed', getErrorMessage(err, 'Failed to delete product'));
                }
              });
            },
          },
        ],
      );
    },
    [onListChanged, runWithBusy],
  );

  const handleDuplicate = useCallback(
    (product: AdminProductListItem) => {
      const productId = product._id;
      if (!productId) {
        return;
      }

      const isCustomizable = product.productType === 'Customizable';

      Alert.alert(
        'Duplicate product?',
        isCustomizable
          ? 'Creates a new Draft product with the same base configuration. Images, videos, and downloadable files are not copied. Variations must be configured separately.'
          : 'Creates a new Draft product with the same configuration. Images, videos, and downloadable files are not copied.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Duplicate',
            onPress: () => {
              void runWithBusy(productId, async () => {
                const duplicated = await duplicateProduct(product);
                if (duplicated?._id) {
                  navigateToAdminDuplicatedProductEdit(navigation, duplicated);
                  return;
                }

                const validation = validateAdminProductDuplicatable(product);
                if (!validation.canDuplicate) {
                  Alert.alert(
                    'Unable to duplicate',
                    getAdminDuplicateValidationMessage(validation),
                  );
                }
              });
            },
          },
        ],
      );
    },
    [duplicateProduct, navigation, runWithBusy],
  );

  const handleMenuAction = useCallback(
    (actionId: AdminProductCardActionId) => {
      const product = menuProduct;
      closeMenu();

      if (!product) {
        return;
      }

      switch (actionId) {
        case 'changeApprovalStatus':
          setApprovalMenuProduct(product);
          break;
        case 'view':
          handleView(product);
          break;
        case 'edit':
          handleEdit(product);
          break;
        case 'preview':
          void handlePreview(product);
          break;
        case 'disable':
          handleDisable(product, 0);
          break;
        case 'enable':
          handleDisable(product, 1);
          break;
        case 'delete':
          handleDelete(product);
          break;
        case 'duplicate':
          handleDuplicate(product);
          break;
        default:
          break;
      }
    },
    [
      closeMenu,
      handleDelete,
      handleDisable,
      handleDuplicate,
      handleEdit,
      handlePreview,
      handleView,
      menuProduct,
    ],
  );

  const handleApprovalMenuAction = useCallback(
    (actionId: AdminProductCardActionId) => {
      const product = approvalMenuProduct;
      closeApprovalMenu();

      if (!product) {
        return;
      }

      const statusByAction: Partial<Record<AdminProductCardActionId, AdminProductApprovalStatus>> = {
        approvalPending: 'Pending',
        approvalReview: 'Review',
        approvalApproved: 'Approved',
        approvalDisapproved: 'Disapproved',
        approvalDraft: 'Draft',
      };
      const nextStatus = statusByAction[actionId];
      if (nextStatus) {
        handleApprovalStatusChange(product, nextStatus);
      }
    },
    [approvalMenuProduct, closeApprovalMenu, handleApprovalStatusChange],
  );

  const menuActions = menuProduct ? buildAdminProductCardActions(menuProduct) : [];
  const approvalMenuActions = approvalMenuProduct
    ? buildAdminProductApprovalActions(approvalMenuProduct)
    : [];

  return {
    menuProduct,
    approvalMenuProduct,
    menuActions,
    approvalMenuActions,
    openMenu,
    closeMenu,
    closeApprovalMenu,
    handleMenuAction,
    handleApprovalMenuAction,
    handleView,
    busyProductId,
  };
}
