import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserPricingInfo } from '../pricing/types';

const USER_PRICING_KEY = 'afoma.userInfo';
const GEO_RETRY_KEY = 'afoma.geoRetryAfter';

/** Match web GEO_RETRY_COOLDOWN_MS — pause anonymous geo after upstream failures. */
export const GEO_RETRY_COOLDOWN_MS = 30 * 60 * 1000;

export async function getStoredUserPricingInfo(): Promise<UserPricingInfo> {
  try {
    const raw = await AsyncStorage.getItem(USER_PRICING_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as UserPricingInfo;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function setStoredUserPricingInfo(info: UserPricingInfo): Promise<void> {
  await AsyncStorage.setItem(USER_PRICING_KEY, JSON.stringify(info));
}

export async function clearStoredUserPricingInfo(): Promise<void> {
  await AsyncStorage.removeItem(USER_PRICING_KEY);
}

export async function isGeoCoolingDown(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(GEO_RETRY_KEY);
    return Date.now() < Number(raw ?? 0);
  } catch {
    return false;
  }
}

export async function startGeoCooldown(): Promise<void> {
  try {
    await AsyncStorage.setItem(GEO_RETRY_KEY, String(Date.now() + GEO_RETRY_COOLDOWN_MS));
  } catch {
    /* storage unavailable */
  }
}

export async function clearGeoCooldown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GEO_RETRY_KEY);
  } catch {
    /* storage unavailable */
  }
}
