import type { AxiosRequestConfig } from 'axios';

import { applyBearerToAxiosConfig } from './authenticatedRequest';
import { getAccessToken, getAccessTokenSync } from '../storage/secureStorage';
import { apiClient, getSessionAccessTokenSync, resolveRequestAccessToken } from './client';
import { ApiError, toApiError } from './errors';
import { isPublicApiRequest } from './publicCatalogPaths';
import { resolveRequestPath } from './resolveRequestPath';

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);
const GATEWAY_RETRY_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveAuthCheckPath(config: AxiosRequestConfig): string {
  return resolveRequestPath({
    url: config.url,
    baseURL: config.baseURL ?? apiClient.defaults.baseURL,
  });
}

/** Attach Bearer when available; never block anonymous public storefront reads. */
async function attachPrivateRouteAuthIfNeeded(config: AxiosRequestConfig): Promise<void> {
  const method = (config.method ?? 'get').toLowerCase();
  const path = resolveAuthCheckPath(config);

  if (isPublicApiRequest(method, path)) {
    return;
  }

  let token = getAccessTokenSync() ?? getSessionAccessTokenSync();
  if (!token) {
    token = await getAccessToken();
  }
  if (!token) {
    token = await resolveRequestAccessToken().catch(() => null);
  }
  if (!token?.trim()) {
    return;
  }

  applyBearerToAxiosConfig(config, token.trim());
}

export async function apiRequest<T>(
  config: AxiosRequestConfig,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const maxAttempts = 2;
  const requestConfig: AxiosRequestConfig = { ...config };
  await attachPrivateRouteAuthIfNeeded(requestConfig);

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await apiClient.request<T>(requestConfig);
      return response.data;
    } catch (error) {
      lastError = error;
      const apiError = toApiError(error, fallbackMessage);
      const shouldRetry =
        attempt + 1 < maxAttempts &&
        apiError.statusCode != null &&
        GATEWAY_RETRY_STATUSES.has(apiError.statusCode);

      if (!shouldRetry) {
        throw apiError instanceof ApiError ? apiError : toApiError(error, fallbackMessage);
      }

      await sleep(GATEWAY_RETRY_DELAY_MS);
    }
  }

  throw toApiError(lastError, fallbackMessage);
}

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
  fallbackMessage = 'Request failed',
): Promise<T> {
  return apiRequest<T>({ ...config, method: 'GET', url }, fallbackMessage);
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  fallbackMessage = 'Request failed',
): Promise<T> {
  return apiRequest<T>({ ...config, method: 'POST', url, data }, fallbackMessage);
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  fallbackMessage = 'Request failed',
): Promise<T> {
  return apiRequest<T>({ ...config, method: 'PUT', url, data }, fallbackMessage);
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
  fallbackMessage = 'Request failed',
): Promise<T> {
  return apiRequest<T>({ ...config, method: 'DELETE', url }, fallbackMessage);
}
