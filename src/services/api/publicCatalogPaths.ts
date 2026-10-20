/** Paths that apiAccessGate treats as public catalog GETs — omit Bearer on mobile to avoid gateway/auth edge cases. */
const PUBLIC_CATALOG_GET_PREFIXES = [
  '/products',
  '/categories',
  '/sub-categories',
  '/child-category',
  '/services',
  '/search',
  '/sellers',
  '/reviews',
  '/shipping-config',
  '/seller/shipping-config',
  '/global-attribute',
  '/settings/public',
  '/settings/type/terms-conditions',
  '/commission/payout-access',
];

function pathOnly(url: string | undefined): string {
  if (!url) {
    return '';
  }
  return url.split('?')[0];
}

export function isPublicCatalogGetPath(url: string | undefined): boolean {
  const path = pathOnly(url);
  if (!path) {
    return false;
  }
  if (path === '/' || path === '/favicon.ico') {
    return true;
  }

  return PUBLIC_CATALOG_GET_PREFIXES.some((prefix) => {
    const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    return path === base || path.startsWith(`${base}/`);
  });
}

/** Auth/signup POSTs that must work before a session exists (mirrors backend apiAccessGate). */
const PUBLIC_POST_PATHS = new Set([
  '/users',
  '/users/login',
  '/users/verify-otp',
  '/users/send-otp-toEmail',
  '/users/forgot-password',
  '/users/verify-recaptcha',
  '/cart/add-cart',
  '/waitlist',
  '/auth/login',
  '/auth/token',
  '/shipping/getRate',
  '/coupon/apply-coupon',
  '/sellers/sellerByIds',
]);

export function isPublicPostPath(url: string | undefined): boolean {
  const path = pathOnly(url);
  if (!path) {
    return false;
  }
  if (PUBLIC_POST_PATHS.has(path)) {
    return true;
  }
  return path.startsWith('/users/reset-password/') || path.startsWith('/guest-user');
}

export function isPublicApiRequest(method: string, url: string | undefined): boolean {
  const normalizedMethod = method.toLowerCase();
  if (normalizedMethod === 'get') {
    return isPublicCatalogGetPath(url);
  }
  if (normalizedMethod === 'post') {
    return isPublicPostPath(url);
  }
  return false;
}
