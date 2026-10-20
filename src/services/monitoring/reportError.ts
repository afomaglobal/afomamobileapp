import { captureSentryException, initSentry } from './initSentry';

/**
 * Central error reporting — Sentry when EXPO_PUBLIC_SENTRY_DSN is set in EAS/production env.
 */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (__DEV__) {
    console.error('[reportError]', context ?? {}, error);
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    console.error('[reportError]', context ?? {}, error);
    return;
  }

  initSentry();
  if (context) {
    try {
      const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
      Sentry.withScope((scope) => {
        for (const [key, value] of Object.entries(context)) {
          scope.setTag(key, value);
        }
        Sentry.captureException(error);
      });
      return;
    } catch {
      captureSentryException(error);
      return;
    }
  }

  captureSentryException(error);
}
