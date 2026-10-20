import { buildStorefrontShopUrl } from '../../../utils/storefrontUrl';

export function getShopShareUrl(slug?: string): string | undefined {
  return buildStorefrontShopUrl(slug);
}
