import axios, { type InternalAxiosRequestConfig } from 'axios';

import { env } from '../../app/config/env';
import { getAccessToken, getAccessTokenSync } from '../storage/secureStorage';
import { applyBearerToAxiosConfig } from './authenticatedRequest';
import { isPublicApiRequest } from './publicCatalogPaths';
import { resolveRequestPath } from './resolveRequestPath';
import {
  getSessionAccessTokenSync,
  registerSessionAccessTokenFallback,
  resolveRequestAccessToken,
} from './sessionAccessToken';

export {
  getSessionAccessTokenSync,
  registerSessionAccessTokenFallback,
  resolveRequestAccessToken,
};

function stripAuthorizationHeader(config: InternalAxiosRequestConfig): void {
  const headers = config.headers;
  if (!headers) {
    return;
  }

  if (typeof headers.delete === 'function') {
    headers.delete('Authorization');
    headers.delete('authorization');
    return;
  }

  const record = headers as Record<string, unknown>;
  delete record.Authorization;
  delete record.authorization;
}

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const path = resolveRequestPath({
    url: config.url,
    baseURL: config.baseURL ?? apiClient.defaults.baseURL,
  });
  if (isPublicApiRequest(method, path)) {
    stripAuthorizationHeader(config);
    return config;
  }

  const existingAuth =
    config.headers?.Authorization ??
    (typeof config.headers?.get === 'function' ? config.headers.get('Authorization') : undefined);
  if (existingAuth) {
    return config;
  }

  let token = getAccessTokenSync() ?? getSessionAccessTokenSync();
  if (!token) {
    token = await getAccessToken();
  }
  if (!token) {
    token = getSessionAccessTokenSync();
  }
  if (!token?.trim()) {
    try {
      token = await resolveRequestAccessToken();
    } catch {
      // Caller receives 401; interceptor cannot invent a token.
    }
  }
  if (token?.trim()) {
    applyBearerToAxiosConfig(config, token.trim());
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadAuth = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 403 && !hadAuth) {
      error.message =
        `${error.message} — API returned 403. Sign in again; private routes require a valid session token.`;
    }
    if (error.response?.status === 401 && !hadAuth) {
      error.message = `${error.message} — Sign in again to refresh your session.`;
    }
    return Promise.reject(error);
  },
);
