import { env } from '../../app/config/env';
import { getAccessToken, getAccessTokenSync } from '../storage/secureStorage';
import { getSessionAccessTokenSync, resolveRequestAccessToken } from './sessionAccessToken';
import { ApiError, getApiResponseErrorMessage } from './errors';

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);
const GATEWAY_RETRY_DELAY_MS = 1200;

function buildApiUrl(path: string): string {
  const base = (env.apiUrl || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function resolveToken(explicitAccessToken?: string | null): Promise<string> {
  const explicit = explicitAccessToken?.trim();
  if (explicit) {
    return explicit;
  }

  const synced =
    getSessionAccessTokenSync() ?? getAccessTokenSync() ?? (await getAccessToken()) ?? null;
  const trimmed = synced?.trim();
  if (trimmed) {
    return trimmed;
  }

  return resolveRequestAccessToken();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = getApiResponseErrorMessage(data, fallbackMessage);
    throw new ApiError(message, response.status, data as Record<string, unknown>);
  }

  return data as T;
}

export async function privateApiFetchJson<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
  fallbackMessage = 'Request failed',
): Promise<T> {
  const token = (await resolveToken(init.accessToken)).trim();
  if (!token) {
    throw new ApiError('Sign in required. Please log in again.', 401);
  }
  const { accessToken: _ignored, headers, ...rest } = init;
  const url = buildApiUrl(path);
  const maxAttempts = (rest.method ?? 'GET').toUpperCase() === 'GET' ? 2 : 1;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...rest,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        },
      });

      if (
        attempt + 1 < maxAttempts &&
        GATEWAY_RETRY_STATUSES.has(response.status)
      ) {
        await sleep(GATEWAY_RETRY_DELAY_MS);
        continue;
      }

      return await parseJsonResponse<T>(response, fallbackMessage);
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError(fallbackMessage);
}
