function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isKorapayDeepLinkUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith('afoma://checkout/korapay');
}

export function extractKorapayReference(url: string): string | null {
  const parsed = tryParseUrl(url);
  if (parsed) {
    const reference = parsed.searchParams.get('reference');
    return reference?.trim() ? reference.trim() : null;
  }

  const match = url.match(/[?&]reference=([^&]+)/i);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function isKorapayReturnUrl(url: string): boolean {
  const reference = extractKorapayReference(url);
  if (!reference) {
    return false;
  }

  if (isKorapayDeepLinkUrl(url)) {
    return true;
  }

  // Web checkout only (not used by the mobile app).
  if (url.toLowerCase().includes('redirect-page')) {
    return true;
  }

  return false;
}

function readQueryParam(url: string, key: string): string | null {
  const parsed = tryParseUrl(url);
  if (parsed) {
    return parsed.searchParams.get(key);
  }

  const match = url.match(new RegExp(`[?&]${key}=([^&]+)`, 'i'));
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isKorapayCheckoutCancelledUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();

  if (isKorapayDeepLinkUrl(url) && !extractKorapayReference(url)) {
    return true;
  }

  const status = (
    readQueryParam(url, 'status') ||
    readQueryParam(url, 'payment_status') ||
    readQueryParam(url, 'transaction_status') ||
    ''
  )
    .trim()
    .toLowerCase();

  if (['failed', 'cancelled', 'canceled', 'cancel', 'abandoned', 'closed', 'declined'].includes(status)) {
    return true;
  }

  if (readQueryParam(url, 'cancelled') === 'true' || readQueryParam(url, 'canceled') === 'true') {
    return true;
  }

  const parsed = tryParseUrl(url);
  if (parsed) {
    const path = parsed.pathname.toLowerCase();
    if (
      path.endsWith('/cancel') ||
      path.includes('/cancel/') ||
      path.includes('/cancelled') ||
      path.includes('/canceled') ||
      path.includes('payment-cancel')
    ) {
      return true;
    }
  }

  // Avoid matching unrelated URLs that merely contain "cancel" in the host/path.
  if (lower.includes('korapay') && (lower.includes('cancelled=') || lower.includes('canceled='))) {
    return true;
  }

  return false;
}

export type KorapayNavigationDecision = 'complete' | 'cancel' | 'ignore';

export function evaluateKorapayNavigation(url: string | undefined): KorapayNavigationDecision {
  if (!url) {
    return 'ignore';
  }

  if (isKorapayDeepLinkUrl(url)) {
    return extractKorapayReference(url) ? 'complete' : 'cancel';
  }

  if (isKorapayCheckoutCancelledUrl(url)) {
    return 'cancel';
  }

  if (isKorapayReturnUrl(url)) {
    return 'complete';
  }

  return 'ignore';
}
