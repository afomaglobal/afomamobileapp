import type { Product } from '../../../../services/types/product';
import { canSubmitProductForReview } from '../api/sellerProductsApi';
import type { SellerProductCardAction } from '../components/SellerProductCardActionsMenu';
import { getProductRouteId } from '../../../products/utils/productDisplay';

export function buildSellerProductCardActions(
  product: Product,
  options?: { canActivateListings?: boolean },
): SellerProductCardAction[] {
  const canActivateListings = options?.canActivateListings ?? true;
  const isActive = product.status === 1;
  const canSubmit = canSubmitProductForReview(product.productStatus);
  const canPreview = Boolean(getProductRouteId(product)?.trim() || product.slug?.trim());

  const actions: SellerProductCardAction[] = [
    { id: 'preview', label: 'Preview', disabled: !canPreview },
    { id: 'edit', label: 'Edit' },
  ];

  if (canSubmit) {
    actions.push({ id: 'submitForReview', label: 'Submit for review' });
  }

  actions.push(
    isActive
      ? { id: 'deactivate', label: 'Deactivate' }
      : {
          id: 'activate',
          label: 'Activate',
          disabled: !canActivateListings,
        },
    { id: 'delete', label: 'Delete', destructive: true },
  );

  return actions;
}
