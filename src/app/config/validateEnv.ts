import { env } from './env';

/** Shared STG backend — development and preview EAS profiles use the same hosts. */
export const STG_API_HOST = 'development.afomamarketplace.com';
export const STG_STOREFRONT_HOST = 'staging.afomamarketplace.com';

export type AppEnvConfig = {
  apiUrl: string;
  socketUrl: string;
  storefrontUrl: string;
};

export type EnvValidationIssue = {
  field: string;
  message: string;
};

function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function hostnameFromUrl(value: string): string | null {
  try {
    return new URL(value.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isStgApiHostname(hostname: string): boolean {
  return hostname === STG_API_HOST;
}

function isStgStorefrontHostname(hostname: string): boolean {
  return hostname === STG_STOREFRONT_HOST;
}

function isAnyStgHostname(hostname: string): boolean {
  return isStgApiHostname(hostname) || isStgStorefrontHostname(hostname);
}

function validateStgApiField(
  issues: EnvValidationIssue[],
  field: 'EXPO_PUBLIC_API_URL' | 'EXPO_PUBLIC_SOCKET_URL',
  value: string,
  required: boolean,
): void {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      issues.push({ field, message: 'URL is required.' });
    }
    return;
  }

  if (!isHttpsUrl(trimmed)) {
    issues.push({ field, message: 'URL must use HTTPS.' });
    return;
  }

  const hostname = hostnameFromUrl(trimmed);
  if (!hostname || isLocalHost(hostname)) {
    issues.push({ field, message: 'URL must not use localhost.' });
    return;
  }

  if (!isStgApiHostname(hostname)) {
    issues.push({
      field,
      message: `URL must use the approved STG API host (${STG_API_HOST}).`,
    });
  }
}

function validateStgStorefrontField(issues: EnvValidationIssue[], value: string): void {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  if (!isHttpsUrl(trimmed)) {
    issues.push({ field: 'EXPO_PUBLIC_STOREFRONT_URL', message: 'Storefront URL must use HTTPS.' });
    return;
  }

  const hostname = hostnameFromUrl(trimmed);
  if (!hostname || isLocalHost(hostname)) {
    issues.push({ field: 'EXPO_PUBLIC_STOREFRONT_URL', message: 'Storefront URL must not use localhost.' });
    return;
  }

  if (!isStgStorefrontHostname(hostname)) {
    issues.push({
      field: 'EXPO_PUBLIC_STOREFRONT_URL',
      message: `Storefront URL must use the approved STG storefront host (${STG_STOREFRONT_HOST}).`,
    });
  }
}

function validateProductionUrlField(
  issues: EnvValidationIssue[],
  field: 'EXPO_PUBLIC_API_URL' | 'EXPO_PUBLIC_SOCKET_URL' | 'EXPO_PUBLIC_STOREFRONT_URL',
  value: string,
  required: boolean,
): void {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      issues.push({ field, message: 'URL is required.' });
    }
    return;
  }

  if (!isHttpsUrl(trimmed)) {
    issues.push({ field, message: 'URL must use HTTPS.' });
    return;
  }

  const hostname = hostnameFromUrl(trimmed);
  if (!hostname || isLocalHost(hostname)) {
    issues.push({ field, message: 'URL must not use localhost.' });
    return;
  }

  if (isAnyStgHostname(hostname)) {
    issues.push({
      field,
      message: 'Production builds must not use STG (development.* or staging.*) hosts.',
    });
  }
}

function validateStgBuild(config: AppEnvConfig, issues: EnvValidationIssue[]): void {
  validateStgApiField(issues, 'EXPO_PUBLIC_API_URL', config.apiUrl, true);
  validateStgApiField(issues, 'EXPO_PUBLIC_SOCKET_URL', config.socketUrl, false);
  validateStgStorefrontField(issues, config.storefrontUrl);
}

function validateProductionBuild(config: AppEnvConfig, issues: EnvValidationIssue[]): void {
  validateProductionUrlField(issues, 'EXPO_PUBLIC_API_URL', config.apiUrl, true);
  validateProductionUrlField(issues, 'EXPO_PUBLIC_SOCKET_URL', config.socketUrl, false);
  validateProductionUrlField(issues, 'EXPO_PUBLIC_STOREFRONT_URL', config.storefrontUrl, false);
}

/**
 * Validates runtime configuration.
 * - development / preview: approved STG hosts only (shared backend).
 * - production: HTTPS, no localhost, no STG hosts.
 */
export function validateAppEnv(
  config: AppEnvConfig = env,
  appEnv: string = process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];

  if (appEnv === 'production') {
    validateProductionBuild(config, issues);
  } else if (appEnv === 'development' || appEnv === 'preview') {
    validateStgBuild(config, issues);
  }

  return issues;
}

export function assertProductionEnvValid(config: AppEnvConfig = env): void {
  const issues = validateAppEnv(config, 'production');
  if (issues.length === 0) {
    return;
  }

  const summary = issues.map((issue) => `${issue.field}: ${issue.message}`).join('\n');
  throw new Error(`Invalid app environment configuration:\n${summary}`);
}
