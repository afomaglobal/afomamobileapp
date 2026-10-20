import axios, {
  type AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

function bearerValue(accessToken: string): string {
  return `Bearer ${accessToken.trim()}`;
}

/** Sets Authorization on axios config (Axios 1.x AxiosHeaders-safe). */
export function applyBearerToAxiosConfig(
  config: AxiosRequestConfig | InternalAxiosRequestConfig,
  accessToken: string,
): AxiosRequestConfig | InternalAxiosRequestConfig {
  const authorization = bearerValue(accessToken);
  const headers = config.headers ?? {};

  if (typeof (headers as { set?: unknown }).set === 'function') {
    (headers as AxiosHeaders).set('Authorization', authorization);
    config.headers = headers;
    return config;
  }

  config.headers = {
    ...(headers as Record<string, unknown>),
    Authorization: authorization,
  };
  return config;
}

export function withBearerAuthHeaders(
  accessToken: string,
  config?: AxiosRequestConfig,
): AxiosRequestConfig {
  return applyBearerToAxiosConfig({ ...config, headers: config?.headers ?? {} }, accessToken);
}
