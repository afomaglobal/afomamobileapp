import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STG_API_HOST,
  STG_STOREFRONT_HOST,
  type AppEnvConfig,
  validateAppEnv,
} from './validateEnv';

const stgConfig: AppEnvConfig = {
  apiUrl: `https://${STG_API_HOST}`,
  socketUrl: `https://${STG_API_HOST}`,
  storefrontUrl: `https://${STG_STOREFRONT_HOST}`,
};

describe('validateAppEnv — development & preview (shared STG)', () => {
  for (const appEnv of ['development', 'preview'] as const) {
    it(`accepts approved STG URLs for ${appEnv}`, () => {
      assert.deepEqual(validateAppEnv(stgConfig, appEnv), []);
    });

    it(`rejects localhost API for ${appEnv}`, () => {
      const issues = validateAppEnv(
        { ...stgConfig, apiUrl: 'http://localhost:3100' },
        appEnv,
      );
      assert.ok(issues.some((issue) => issue.field === 'EXPO_PUBLIC_API_URL'));
    });

    it(`rejects non-STG API host for ${appEnv}`, () => {
      const issues = validateAppEnv(
        { ...stgConfig, apiUrl: 'https://api.afomamarketplace.com' },
        appEnv,
      );
      assert.ok(
        issues.some(
          (issue) =>
            issue.field === 'EXPO_PUBLIC_API_URL' && issue.message.includes(STG_API_HOST),
        ),
      );
    });

    it(`rejects non-STG storefront for ${appEnv}`, () => {
      const issues = validateAppEnv(
        { ...stgConfig, storefrontUrl: 'https://afomamarketplace.com' },
        appEnv,
      );
      assert.ok(issues.some((issue) => issue.field === 'EXPO_PUBLIC_STOREFRONT_URL'));
    });
  }
});

describe('validateAppEnv — production', () => {
  const productionConfig: AppEnvConfig = {
    apiUrl: 'https://api.afomamarketplace.com',
    socketUrl: 'https://api.afomamarketplace.com',
    storefrontUrl: 'https://afomamarketplace.com',
  };

  it('accepts non-STG production HTTPS hosts', () => {
    assert.deepEqual(validateAppEnv(productionConfig, 'production'), []);
  });

  it('rejects STG API host', () => {
    const issues = validateAppEnv(
      { ...productionConfig, apiUrl: `https://${STG_API_HOST}` },
      'production',
    );
    assert.ok(issues.some((issue) => issue.field === 'EXPO_PUBLIC_API_URL'));
  });

  it('rejects STG storefront host', () => {
    const issues = validateAppEnv(
      { ...productionConfig, storefrontUrl: `https://${STG_STOREFRONT_HOST}` },
      'production',
    );
    assert.ok(issues.some((issue) => issue.field === 'EXPO_PUBLIC_STOREFRONT_URL'));
  });

  it('rejects HTTP API URL', () => {
    const issues = validateAppEnv(
      { ...productionConfig, apiUrl: 'http://afomamarketplace.com' },
      'production',
    );
    assert.ok(issues.some((issue) => issue.field === 'EXPO_PUBLIC_API_URL'));
  });
});
