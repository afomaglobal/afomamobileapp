/**
 * Two app variants from one codebase (app.json is the base config):
 *
 *   APP_VARIANT=test   → "AFOMATest", bundle/package com.afomamarketplace.afomamobile.test
 *   (unset)            → "AFOMA",     bundle/package com.afomamarketplace.afomamobile (live)
 *
 * Different identifiers let both apps be installed side by side. The EAS build profiles in
 * eas.json set APP_VARIANT (development + preview = test, production = live).
 *
 * The URL scheme stays "afoma" for both: checkout redirects (PayPal/Korapay) are hard-coded
 * to afoma://. Avoid relying on deep links when both apps are installed on one device.
 */
const IS_TEST = process.env.APP_VARIANT === 'test';

const LIVE_ID = 'com.afomamarketplace.afomamobile';
const TEST_ID = `${LIVE_ID}.test`;

module.exports = ({ config }) => {
  if (!IS_TEST) {
    return config;
  }

  return {
    ...config,
    name: 'AFOMATest',
    ios: {
      ...config.ios,
      bundleIdentifier: TEST_ID,
    },
    android: {
      ...config.android,
      package: TEST_ID,
      // google-services.json must contain an Android client for TEST_ID (add the app in
      // Firebase, then re-download the file — one file covers both packages).
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile,
    },
  };
};
