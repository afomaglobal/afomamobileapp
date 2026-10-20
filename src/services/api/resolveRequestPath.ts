import type { InternalAxiosRequestConfig } from 'axios';

/** Pathname for gate/public-catalog checks (relative or absolute config.url). */
export function resolveRequestPath(config: Pick<InternalAxiosRequestConfig, 'url' | 'baseURL'>): string {
  const raw = config.url ?? '';
  if (!raw) {
    return '';
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw.split('?')[0];
    }
  }

  const base = config.baseURL ?? '';
  if (base.startsWith('http://') || base.startsWith('https://')) {
    try {
      return new URL(raw, base.endsWith('/') ? base : `${base}/`).pathname;
    } catch {
      return raw.split('?')[0];
    }
  }

  return raw.split('?')[0];
}
