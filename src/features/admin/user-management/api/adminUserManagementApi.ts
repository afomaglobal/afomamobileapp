import { apiDelete, apiGet, apiPost, apiPut } from '../../../../services/api/request';
import type {
  AdminUserAdminUpdatePayload,
  AdminUserCreatePayload,
  AdminUserListItem,
  AdminUserListQuery,
  AdminUserListResponse,
} from '../types/adminUserManagement';

export const ADMIN_USER_LIST_PAGE_SIZE = 10;

function buildAdminUserListParams(query: AdminUserListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page,
    limit: query.limit,
  };

  if (query.search?.trim()) {
    params.search = query.search.trim();
  }

  if (query.role) {
    params.role = query.role;
  }

  return params;
}

/** GET /users?page&limit&search&role — admin user list (web parity). */
export async function getAdminUserList(query: AdminUserListQuery): Promise<AdminUserListResponse> {
  const response = await apiGet<AdminUserListResponse | AdminUserListItem[]>(
    '/users',
    { params: buildAdminUserListParams(query) },
    'Failed to load users',
  );

  if (Array.isArray(response)) {
    return {
      users: response,
      totalUsers: response.length,
      totalPages: 1,
    };
  }

  const users = Array.isArray(response.users) ? response.users : [];

  return {
    users,
    totalUsers: response.totalUsers ?? users.length,
    totalPages: response.totalPages ?? 1,
  };
}

/** GET /users/{userId} */
export async function getAdminUserById(userId: string): Promise<AdminUserListItem> {
  return apiGet<AdminUserListItem>(
    `/users/${encodeURIComponent(userId)}`,
    undefined,
    'Failed to load user',
  );
}

interface AdminUserCreateResponse {
  message?: string;
  data?: { _id?: string; email?: string; role?: string; affiliateStatus?: string };
}

/**
 * POST /users — admin create (web parity; seller excluded at payload type level).
 * The API decides the creator's role from the signed-in administrator's token, so the
 * token must be sent even though POST /users is also the public registration route.
 * Creating an affiliate this way starts a pending affiliate application.
 */
export async function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUserListItem> {
  const response = await apiPost<AdminUserCreateResponse>(
    '/users',
    payload,
    { sendAuthOnPublicPath: true },
    'Failed to create user',
  );
  const created = response?.data;
  if (!created?._id) {
    throw new Error(response?.message || 'Failed to create user');
  }

  return {
    ...payload,
    _id: created._id,
    email: created.email ?? payload.email,
    userRole: created.role ?? payload.userRole,
  } as AdminUserListItem;
}

/** PUT /users/byAdmin/{userId} — primary admin edit path (not PUT /users/{id}). */
export async function updateAdminUserByAdmin(
  userId: string,
  payload: AdminUserAdminUpdatePayload,
): Promise<AdminUserListItem> {
  return apiPut<AdminUserListItem>(
    `/users/byAdmin/${encodeURIComponent(userId)}`,
    payload,
    undefined,
    'Failed to update user',
  );
}

/** PUT /users/byAdmin/{userId} — profile photo only (partial update supported by backend). */
export async function patchAdminUserProfilePhoto(
  userId: string,
  userProfile: string,
): Promise<AdminUserListItem> {
  return apiPut<AdminUserListItem>(
    `/users/byAdmin/${encodeURIComponent(userId)}`,
    { userProfile },
    undefined,
    'Failed to update profile photo',
  );
}

/** DELETE /users/{userId} — hard-delete contract assumed; verify on staging. */
export async function deleteAdminUser(userId: string): Promise<void> {
  await apiDelete<void>(
    `/users/${encodeURIComponent(userId)}`,
    undefined,
    'Failed to delete user',
  );
}
