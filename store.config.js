/**
 * EAS Metadata entry (see eas.json metadataPath).
 * STG buyer email is never committed — set APP_STORE_DEMO_USERNAME before push.
 */
const base = require('./store.config.json');

const PLACEHOLDER_USERNAME = 'SET_APP_STORE_DEMO_USERNAME_ENV';

function resolveDemoUsername() {
  const fromEnv = process.env.APP_STORE_DEMO_USERNAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const fromJson = base.apple?.review?.demoUsername?.trim();
  if (fromJson && fromJson !== PLACEHOLDER_USERNAME) {
    return fromJson;
  }
  throw new Error(
    [
      'Missing App Store demo username for metadata:push.',
      'Set APP_STORE_DEMO_USERNAME to your STG buyer email (PowerShell example):',
      '  $env:APP_STORE_DEMO_USERNAME="appreview-buyer@your-domain.com"',
      'Then run: npm run metadata:push',
    ].join('\n'),
  );
}

const demoPassword =
  process.env.APP_STORE_DEMO_PASSWORD?.trim() ||
  base.apple.review.demoPassword ||
  'OTP-only — no password; code emailed to the demo username.';

module.exports = {
  ...base,
  apple: {
    ...base.apple,
    review: {
      ...base.apple.review,
      demoUsername: resolveDemoUsername(),
      demoPassword,
    },
  },
};
