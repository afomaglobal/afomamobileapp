import type { AuthUser, StoredUserProfile } from '../types';

function trimId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Mongo User `_id` for routes that call `User.findById` (account, cart, push, etc.). */
export function resolveBackendUserDocumentId(
  user: AuthUser | StoredUserProfile | null | undefined,
): string | undefined {
  if (!user) {
    return undefined;
  }

  const candidate = user as (AuthUser | StoredUserProfile) & { id?: string };

  // Seller OTP payload uses `_id` for the seller document; linked User is in `userId`.
  if (candidate.userRole === 'seller' || candidate.sellerId) {
    return trimId(candidate.userId) ?? trimId(candidate.id);
  }

  return trimId(candidate._id) ?? trimId(candidate.userId) ?? trimId(candidate.id);
}
