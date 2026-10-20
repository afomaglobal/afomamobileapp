import type { UserRole } from '../../features/auth/types';
import { resolveRequestAccessToken } from './client';
import { withBearerAuthHeaders } from './authenticatedRequest';
import { apiDelete, apiGet, apiPut } from './request';

export interface SavedUserAddress {
  _id?: string;
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  countryCode?: string;
  ZipCode?: string;
  zipcode?: string;
  phone?: string;
  moNumber?: string;
  isDefault?: boolean;
}

export interface UserProfileResponse {
  userId?: string;
  _id?: string;
  userRole?: UserRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  moNumber?: string;
  gender?: string;
  DOB?: string;
  web3address?: string;
  networkType?: string;
  userProfile?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country?: string;
  countryName?: string;
  Country?: string;
  countryCode?: string;
  ZipCode?: string;
  zipcode?: string;
  company?: string;
  address?: SavedUserAddress[];
  createdAt?: string;
  updatedAt?: string;
}

/** PUT /users/{userId} — customer account details (web parity). */
export interface UpdateUserProfileRequest {
  firstName: string;
  lastName: string;
  DOB?: string | null;
  gender?: string;
  email: string;
  phone: string;
  web3address?: string;
  country: string;
  state: string;
  city: string;
  streetAddress: string;
  ZipCode: string;
  countryCode: string;
  stateCode: string;
}

async function privateAuthConfig(accessToken?: string | null) {
  const token = accessToken?.trim() || (await resolveRequestAccessToken());
  return withBearerAuthHeaders(token);
}

export async function getUserProfile(
  userId: string,
  accessToken?: string | null,
): Promise<UserProfileResponse> {
  return apiGet<UserProfileResponse>(
    `/users/${encodeURIComponent(userId)}`,
    await privateAuthConfig(accessToken),
    'Failed to load user profile',
  );
}

export async function updateUserAddresses(
  userId: string,
  address: SavedUserAddress[],
  accessToken?: string | null,
): Promise<UserProfileResponse> {
  return apiPut<UserProfileResponse>(
    `/users/${encodeURIComponent(userId)}`,
    { address },
    await privateAuthConfig(accessToken),
    'Failed to update saved addresses',
  );
}

export async function updateUserProfile(
  userId: string,
  body: UpdateUserProfileRequest,
  accessToken?: string | null,
): Promise<UserProfileResponse> {
  return apiPut<UserProfileResponse>(
    `/users/${encodeURIComponent(userId)}`,
    body,
    await privateAuthConfig(accessToken),
    'Failed to update account details',
  );
}

export async function deleteUserAccount(
  userId: string,
  accessToken?: string | null,
): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(
    `/users/${encodeURIComponent(userId)}`,
    await privateAuthConfig(accessToken),
    'Failed to delete account',
  );
}

export async function updateUserProfilePhoto(
  userId: string,
  userProfile: string,
  accessToken?: string | null,
): Promise<UserProfileResponse> {
  return apiPut<UserProfileResponse>(
    `/users/${encodeURIComponent(userId)}`,
    { userProfile },
    await privateAuthConfig(accessToken),
    'Failed to update profile photo',
  );
}
