import type { ComponentType } from 'react';

type SentryModule = typeof import('@sentry/react-native');

let sentryModule: SentryModule | null = null;
let initialized = false;

function loadSentry(): SentryModule | null {
  if (sentryModule) {
    return sentryModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentryModule = require('@sentry/react-native') as SentryModule;
    return sentryModule;
  } catch (error) {
    console.warn('[Sentry] Failed to load @sentry/react-native', error);
    return null;
  }
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn || initialized) {
    return;
  }

  const Sentry = loadSentry();
  if (!Sentry) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
  });

  initialized = true;
}

/** Wrap root component when Sentry is configured; otherwise return App unchanged. */
export function wrapRootComponent<P extends Record<string, unknown>>(
  AppComponent: ComponentType<P>,
): ComponentType<P> {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return AppComponent;
  }

  initSentry();
  const Sentry = loadSentry();
  if (!Sentry) {
    return AppComponent;
  }

  return Sentry.wrap(AppComponent);
}

export function captureSentryException(error: unknown): void {
  if (!initialized) {
    initSentry();
  }
  const Sentry = loadSentry();
  Sentry?.captureException(error);
}
