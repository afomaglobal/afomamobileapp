import { getAccessToken, getAccessTokenSync } from '../storage/secureStorage';
import { ApiError } from './errors';

let sessionAccessTokenFallback: (() => string | null) | null = null;

export function registerSessionAccessTokenFallback(resolve: () => string | null): void {
  sessionAccessTokenFallback = resolve;
}

export function getSessionAccessTokenSync(): string | null {
  return getAccessTokenSync() ?? sessionAccessTokenFallback?.() ?? null;
}

export async function resolveRequestAccessToken(): Promise<string> {
  let token = getSessionAccessTokenSync();
  if (!token) {
    token = await getAccessToken();
  }
  if (!token) {
    token = sessionAccessTokenFallback?.() ?? null;
  }
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new ApiError('Sign in required. Please log in again.', 401);
  }
  return trimmed;
}
