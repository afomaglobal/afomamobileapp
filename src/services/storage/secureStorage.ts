import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '../../constants/storageKeys';

/** In-memory copy so the axios interceptor has the token immediately after login (SecureStore can lag). */
let memoryAccessToken: string | null = null;
let memoryAccessTokenHydrated = false;

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export function getAccessTokenSync(): string | null {
  return memoryAccessToken;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** SecureStore can lag briefly after checkout / navigation — retry before treating as logged out. */
export async function getAccessToken(): Promise<string | null> {
  if (memoryAccessToken?.trim()) {
    return memoryAccessToken.trim();
  }

  const attempts = memoryAccessTokenHydrated ? 3 : 2;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const stored = await getSecureItem(STORAGE_KEYS.accessToken);
    if (stored?.trim()) {
      memoryAccessToken = stored.trim();
      memoryAccessTokenHydrated = true;
      return memoryAccessToken;
    }
    if (attempt + 1 < attempts) {
      await sleep(120);
    }
  }

  memoryAccessTokenHydrated = true;
  memoryAccessToken = null;
  return null;
}

/** Keeps axios Authorization in sync with in-memory auth state when SecureStore lags. */
export function primeAccessTokenInMemory(token: string | null | undefined): void {
  if (typeof token === 'string' && token.trim()) {
    memoryAccessToken = token.trim();
    memoryAccessTokenHydrated = true;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  memoryAccessToken = token;
  memoryAccessTokenHydrated = true;
  await setSecureItem(STORAGE_KEYS.accessToken, token);
}

export async function clearAccessToken(): Promise<void> {
  memoryAccessToken = null;
  memoryAccessTokenHydrated = true;
  await deleteSecureItem(STORAGE_KEYS.accessToken);
}
