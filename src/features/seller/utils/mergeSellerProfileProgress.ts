import type { SellerProfile, SellerProfileSetup } from '../types/sellerProfile';

const PROFILE_SETUP_FLAGS: (keyof SellerProfileSetup)[] = [
  'basicInfo',
  'sellerDetails',
  'sellerPolicies',
  'paymentInfo',
  'currency',
  'domesticShipping',
  'internationalShipping',
];

function mergeProfileSetupFlags(
  previous?: SellerProfileSetup,
  incoming?: SellerProfileSetup,
): SellerProfileSetup | undefined {
  if (!previous && !incoming) {
    return undefined;
  }

  const merged: SellerProfileSetup = {
    ...(previous ?? {}),
    ...(incoming ?? {}),
  };

  for (const key of PROFILE_SETUP_FLAGS) {
    if (previous?.[key] === true || incoming?.[key] === true) {
      merged[key] = true;
    }
  }

  return merged;
}

function resolveShippingConfig(
  previous?: SellerProfile['shippingConfigId'],
  incoming?: SellerProfile['shippingConfigId'],
): SellerProfile['shippingConfigId'] {
  if (incoming && typeof incoming === 'object') {
    return incoming;
  }

  if (previous && typeof previous === 'object') {
    return previous;
  }

  return incoming ?? previous;
}

/** Keeps completed setup flags and embedded shipping config when API responses lag behind saves. */
export function mergeSellerProfileProgress(
  previous: SellerProfile | null | undefined,
  incoming: SellerProfile,
): SellerProfile {
  if (!previous) {
    return incoming;
  }

  return {
    ...previous,
    ...incoming,
    profileSetup: mergeProfileSetupFlags(previous.profileSetup, incoming.profileSetup),
    paymentInfo: incoming.paymentInfo?.length ? incoming.paymentInfo : previous.paymentInfo,
    storePolicy: incoming.storePolicy ?? previous.storePolicy,
    shippingConfigId: resolveShippingConfig(previous.shippingConfigId, incoming.shippingConfigId),
  };
}
