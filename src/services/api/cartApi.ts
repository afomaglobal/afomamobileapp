import type { GetCartResponse, SaveCartRequest } from '../types/cart';
import { resolveRequestAccessToken } from './client';
import { withBearerAuthHeaders } from './authenticatedRequest';
import { apiGet, apiPost } from './request';

const EMPTY_CART_RESPONSE: GetCartResponse = {
  cart: {},
  subTotal: 0,
  totalShippingRate: 0,
  fetchedShippingRate: 0,
};

function normalizeCartResponse(response: GetCartResponse | null | undefined): GetCartResponse {
  if (!response) {
    return EMPTY_CART_RESPONSE;
  }

  return {
    cart: response.cart ?? {},
    subTotal: response.subTotal ?? 0,
    totalShippingRate: response.totalShippingRate ?? 0,
    fetchedShippingRate: response.fetchedShippingRate ?? 0,
  };
}

/** POST /cart/add-cart — persists cart for authenticated user */
export async function saveCart(body: SaveCartRequest): Promise<unknown> {
  const token = await resolveRequestAccessToken().catch(() => null);
  return apiPost<unknown>(
    '/cart/add-cart',
    body,
    token ? withBearerAuthHeaders(token) : undefined,
    'Failed to save cart',
  );
}

/** GET /cart/{userId} — hydrate server cart when local cart is empty */
export async function getCartByUserId(userId: string): Promise<GetCartResponse> {
  const token = await resolveRequestAccessToken();
  const response = await apiGet<GetCartResponse | null>(
    `/cart/${encodeURIComponent(userId)}`,
    withBearerAuthHeaders(token),
    'Failed to load cart',
  );

  return normalizeCartResponse(response);
}
