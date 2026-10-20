import { apiGet } from './request';
import type { Seller } from '../types/seller';

export interface SettingsEntry {
  type?: string;
  content?: string | Array<{ id?: string }> | Record<string, unknown>;
}

export interface SettingsAllTypesResponse {
  settings?: SettingsEntry[];
  /** Present on GET /settings/public/home-spotlight — ordered featured sellers. */
  sellers?: Seller[];
}

export interface SettingsTypeResponse {
  settings?: SettingsEntry[];
}

/** GET /settings/type/{type} — CMS content by type (e.g. terms-conditions). */
export async function getSettingsByType(type: string): Promise<SettingsTypeResponse> {
  return apiGet<SettingsTypeResponse>(
    `/settings/type/${encodeURIComponent(type)}`,
    undefined,
    'Failed to load content',
  );
}

/**
 * Parses CMS `content` field — JSON-encoded HTML string (Quill) or raw HTML.
 * Web parity: terms page uses JSON.parse(settings[0].content).
 */
export function parseSettingsHtmlContent(rawContent: unknown): string {
  if (typeof rawContent !== 'string') {
    return '';
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      return parsed.trim();
    }
  } catch {
    // Fall through to raw HTML string.
  }

  return trimmed;
}

/** GET /settings/public/home-spotlight — featured shop IDs for home (public, minimal payload). */
export async function getAllSettingsTypes(): Promise<SettingsAllTypesResponse> {
  return apiGet<SettingsAllTypesResponse>(
    '/settings/public/home-spotlight',
    undefined,
    'Failed to load marketplace settings',
  );
}

/** Full seller objects embedded in admin `shops` settings content (web parity). */
export function extractFeaturedSellersFromSettings(
  settings: SettingsEntry[] | undefined,
): Seller[] {
  if (!settings?.length) {
    return [];
  }

  const sellers: Seller[] = [];

  for (const setting of settings) {
    if (setting.type !== 'shops') {
      continue;
    }

    let content: unknown = setting.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        continue;
      }
    }

    if (!Array.isArray(content)) {
      continue;
    }

    for (const entry of content) {
      if (entry && typeof entry === 'object') {
        sellers.push(entry as Seller);
      }
    }
  }

  return sellers;
}

export function extractFeaturedShopIds(settings: SettingsEntry[] | undefined): string[] {
  if (!settings?.length) {
    return [];
  }

  const shopIds: string[] = [];

  for (const setting of settings) {
    if (setting.type !== 'shops') {
      continue;
    }

    let content: unknown = setting.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        continue;
      }
    }

    if (!Array.isArray(content)) {
      continue;
    }

    for (const seller of content) {
      if (!seller || typeof seller !== 'object') {
        continue;
      }

      const rawId =
        'id' in seller && seller.id
          ? seller.id
          : '_id' in seller && seller._id
            ? seller._id
            : null;

      if (rawId) {
        shopIds.push(String(rawId));
      }
    }
  }

  return shopIds;
}
