import type { Seller } from '../../../services/types/seller';

export type SellerSocialPlatform = 'facebook' | 'tiktok' | 'instagram';

export interface SellerSocialLink {
  platform: SellerSocialPlatform;
  url: string;
}

function normalizeSocialUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Social profiles configured on the seller — shown on the shop About / description area. */
export function getSellerSocialLinks(seller: Seller): SellerSocialLink[] {
  const links: SellerSocialLink[] = [];

  const facebook = seller.facebook?.trim();
  if (facebook) {
    links.push({ platform: 'facebook', url: normalizeSocialUrl(facebook) });
  }

  const tiktok = seller.tiktok?.trim() || seller.twitter?.trim();
  if (tiktok) {
    links.push({ platform: 'tiktok', url: normalizeSocialUrl(tiktok) });
  }

  const instagram = seller.instagram?.trim();
  if (instagram) {
    links.push({ platform: 'instagram', url: normalizeSocialUrl(instagram) });
  }

  return links;
}
