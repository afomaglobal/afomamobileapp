import { getSellerShippingConfig } from '../api/sellerShippingApi';
import type { SellerProfile } from '../../types/sellerProfile';
import { getProfileSetupFromShippingConfig } from './sellerShippingMappers';

function resolveEmbeddedShippingConfig(
  profile: SellerProfile,
): SellerProfile['shippingConfigId'] | undefined {
  const raw = profile.shippingConfigId;
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  return raw;
}

export function mergeProfileSetupFromShippingConfig(profile: SellerProfile): SellerProfile {
  const config = resolveEmbeddedShippingConfig(profile);
  if (!config) {
    return profile;
  }

  const derived = getProfileSetupFromShippingConfig(config);
  if (Object.keys(derived).length === 0) {
    return profile;
  }

  return {
    ...profile,
    profileSetup: {
      ...profile.profileSetup,
      ...derived,
    },
  };
}

/** Ensures shipping checklist flags match saved config (web/backend parity). */
export async function enrichSellerProfileWithShippingSetup(
  sellerId: string,
  profile: SellerProfile,
): Promise<SellerProfile> {
  let config = resolveEmbeddedShippingConfig(profile);

  if (!config) {
    try {
      config = await getSellerShippingConfig(sellerId);
    } catch {
      return mergeProfileSetupFromShippingConfig(profile);
    }
  }

  return mergeProfileSetupFromShippingConfig({
    ...profile,
    shippingConfigId: config ?? profile.shippingConfigId,
  });
}
