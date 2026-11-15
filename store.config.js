/**
 * EAS Metadata entry — merges store.config.json with review credentials from env vars,
 * so no review logins or codes are committed to git.
 *
 * AFOMA login is email + one-time code (no password). The backend gives the review accounts
 * a fixed code (REVIEW_DEMO_EMAILS + REVIEW_DEMO_OTP on the API server), so set the SAME
 * code here. Apple's "password" field gets that code; the seller account goes in the notes.
 *
 * Values come from env vars, or from store/review-credentials.local.json (gitignored) when unset.
 *
 * Before push (PowerShell):
 *   $env:APPLE_REVIEW_DEMO_EMAIL="buyerappreview@afoma.io"
 *   $env:APPLE_REVIEW_SELLER_EMAIL="sellerappreview@afoma.io"
 *   $env:APPLE_REVIEW_DEMO_CODE="123456"            # same as REVIEW_DEMO_OTP on the server
 *   $env:APPLE_REVIEW_VIDEO_URL="https://..."       # screen recording link (optional)
 *   $env:APPLE_REVIEW_COUPON="APPREVIEW100"         # 100%-off demo coupon (optional)
 *   npm run metadata:push
 *
 * APPLE_REVIEW_DEMO_PASSWORD is still accepted as an alias for APPLE_REVIEW_DEMO_CODE.
 */
const fs = require('fs');
const path = require('path');
const base = require('./store.config.json');

// Local fallback (store/ is gitignored): store/review-credentials.local.json
function readLocalReviewFile() {
  const file = path.join(__dirname, 'store', 'review-credentials.local.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

const LOCAL = readLocalReviewFile();
const LOCAL_KEYS = {
  APPLE_REVIEW_DEMO_EMAIL: 'buyerEmail',
  APPLE_REVIEW_SELLER_EMAIL: 'sellerEmail',
  APPLE_REVIEW_DEMO_CODE: 'code',
  APPLE_REVIEW_VIDEO_URL: 'videoUrl',
  APPLE_REVIEW_COUPON: 'coupon',
};

/** Env var first, then store/review-credentials.local.json. */
function readEnv(name) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  const localValue = LOCAL[LOCAL_KEYS[name]];
  return typeof localValue === 'string' ? localValue.trim() : '';
}

module.exports = () => {
  const config = structuredClone(base);
  const review = config.apple?.review;
  if (!review?.demoRequired) {
    return config;
  }

  const buyerEmail = readEnv('APPLE_REVIEW_DEMO_EMAIL');
  const sellerEmail = readEnv('APPLE_REVIEW_SELLER_EMAIL');
  const code = readEnv('APPLE_REVIEW_DEMO_CODE') || readEnv('APPLE_REVIEW_DEMO_PASSWORD');
  const videoUrl = readEnv('APPLE_REVIEW_VIDEO_URL');
  // Optional: a 100%-off coupon for the demo buyer so reviewers can finish an order without paying.
  const coupon = readEnv('APPLE_REVIEW_COUPON');

  const missing = [];
  if (!buyerEmail) missing.push('APPLE_REVIEW_DEMO_EMAIL');
  if (!sellerEmail) missing.push('APPLE_REVIEW_SELLER_EMAIL');
  if (!/^\d{6}$/.test(code)) missing.push('APPLE_REVIEW_DEMO_CODE (6 digits)');
  if (missing.length) {
    throw new Error(
      `Missing review settings: ${missing.join(', ')}. ` +
        'Set them as env vars (PowerShell: $env:NAME="value") and run metadata:push again.',
    );
  }

  review.demoUsername = buyerEmail;
  review.demoPassword = code;
  review.notes = String(review.notes || '')
    .replaceAll('{{BUYER_EMAIL}}', buyerEmail)
    .replaceAll('{{SELLER_EMAIL}}', sellerEmail)
    .replaceAll('{{CODE}}', code)
    .replaceAll('{{VIDEO_URL}}', videoUrl || 'attached in App Review attachments')
    .replaceAll(
      '{{COUPON_NOTE}}',
      coupon
        ? ` To place a complete order without being charged, use coupon code ${coupon} at checkout (demo buyer only).`
        : '',
    );

  if (review.notes.length > 4000) {
    throw new Error(`App Review notes are ${review.notes.length} characters; Apple allows 4000.`);
  }

  return config;
};
