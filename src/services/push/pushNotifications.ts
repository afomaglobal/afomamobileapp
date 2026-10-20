import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import type * as ExpoNotifications from 'expo-notifications';

import {
  areAnyPushNotificationsEnabled,
  getNotificationPreferences,
} from './notificationPreferencesStorage';
import { ApiError } from '../api/errors';
import { registerExpoPushToken, unregisterExpoPushToken } from './pushApi';
import { isPhysicalDevice, isPushNativeAvailable, getPushUnsupportedReason } from './pushNativeSupport';

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);

type NotificationsModule = typeof import('expo-notifications');

export type PushEventSubscription = { remove: () => void };

let notificationsModule: NotificationsModule | null | undefined;
let notificationHandlerConfigured = false;

/** Avoid top-level `import 'expo-notifications'` — it initializes native emitters at module load and can crash reload on stale dev builds. */
function loadExpoNotificationsModule(): NotificationsModule | null {
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  if (!isPushNativeAvailable()) {
    notificationsModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
    ensureNotificationHandler(notificationsModule);
    return notificationsModule;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[push] expo-notifications failed to load. Reload Metro or install the latest development build.',
        error,
      );
    }
    notificationsModule = null;
    return null;
  }
}

function ensureNotificationHandler(Notifications: NotificationsModule): void {
  if (notificationHandlerConfigured) {
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  } catch {
    // Native handler module missing or mismatched — push APIs will no-op elsewhere.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function registerExpoPushTokenWithRetry(
  body: Parameters<typeof registerExpoPushToken>[0],
): Promise<void> {
  try {
    await registerExpoPushToken(body);
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : undefined;
    if (statusCode != null && GATEWAY_RETRY_STATUSES.has(statusCode)) {
      await sleep(1500);
      await registerExpoPushToken(body);
      return;
    }
    throw error;
  }
}

const PUSH_DEVICE_ID_KEY = 'afoma.push.deviceId';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export { isPushNativeAvailable, getPushUnsupportedReason };
export type { PushUnsupportedReason } from './pushNativeSupport';
export { getPushUnsupportedMessage } from './pushNativeSupport';

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(PUSH_DEVICE_ID_KEY);
  if (existing?.trim()) {
    return existing.trim();
  }

  const generated = `mobile-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(PUSH_DEVICE_ID_KEY, generated);
  return generated;
}

export async function getPushDeviceId(): Promise<string> {
  return getOrCreateDeviceId();
}

function resolvePermissionStatus(
  permissions: ExpoNotifications.NotificationPermissionsStatus,
  Notifications: NotificationsModule,
): NotificationPermissionStatus {
  if (!isPhysicalDevice()) {
    return 'unsupported';
  }

  if (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }

  if (
    permissions.ios?.status === Notifications.IosAuthorizationStatus.DENIED ||
    permissions.status === 'denied'
  ) {
    return 'denied';
  }

  return 'undetermined';
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web' || !isPhysicalDevice()) {
    return 'unsupported';
  }

  const Notifications = loadExpoNotificationsModule();
  if (!Notifications) {
    return 'unsupported';
  }

  try {
    const permissions = await Notifications.getPermissionsAsync();
    return resolvePermissionStatus(permissions, Notifications);
  } catch {
    return 'unsupported';
  }
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

function resolveExpoProjectId(): string | undefined {
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof easProjectId === 'string' && easProjectId.trim()) {
    return easProjectId.trim();
  }

  const legacyProjectId = Constants.easConfig?.projectId;
  if (typeof legacyProjectId === 'string' && legacyProjectId.trim()) {
    return legacyProjectId.trim();
  }

  return undefined;
}

async function ensureAndroidNotificationChannels(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('chat-messages', {
    name: 'Chat messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EA580C',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('marketplace-offers', {
    name: 'Offers & promotions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EA580C',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('order-updates', {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EA580C',
    sound: 'default',
  });
}

export async function requestExpoPushPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !isPhysicalDevice()) {
    return false;
  }

  const Notifications = loadExpoNotificationsModule();
  if (!Notifications) {
    return false;
  }

  try {
    await ensureAndroidNotificationChannels(Notifications);

    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return (
      requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!loadExpoNotificationsModule() || !isPhysicalDevice()) {
    return null;
  }

  const hasPermission = await requestExpoPushPermissions();
  if (!hasPermission) {
    return null;
  }

  const Notifications = loadExpoNotificationsModule();
  if (!Notifications) {
    return null;
  }

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    console.warn('Expo push token unavailable: missing EAS projectId in app config.');
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResponse.data?.trim() || null;
}

export async function registerDevicePushToken(userId: string): Promise<string | null> {
  if (!loadExpoNotificationsModule()) {
    return null;
  }

  const preferences = await getNotificationPreferences();
  const anyEnabled =
    preferences.chatMessages || preferences.marketplaceOffers || preferences.orderUpdates;
  if (!anyEnabled) {
    await unregisterDevicePushToken(userId);
    return null;
  }

  const token = await getExpoPushToken();
  if (!token) {
    return null;
  }

  const deviceId = await getOrCreateDeviceId();

  try {
    await registerExpoPushTokenWithRetry({
      userId,
      deviceId,
      expoPushToken: token,
      platform: 'expo',
      pushPreferences: preferences,
    });
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : undefined;
    if (__DEV__ && statusCode != null && GATEWAY_RETRY_STATUSES.has(statusCode)) {
      console.warn(
        'Push subscribe returned a gateway error (502/503/504). The API host may be restarting or the backend push route is not deployed yet.',
        { statusCode, userId, deviceId },
      );
    } else if (__DEV__) {
      console.warn('Push token registration API failed', { statusCode, userId, deviceId });
    }
    throw error;
  }

  return token;
}

export async function unregisterDevicePushToken(userId: string): Promise<void> {
  const deviceId = await getOrCreateDeviceId();
  await unregisterExpoPushToken({ userId, deviceId });
}

export async function syncDevicePushRegistration(userId: string): Promise<string | null> {
  if (!loadExpoNotificationsModule()) {
    return null;
  }

  const anyEnabled = await areAnyPushNotificationsEnabled();
  if (!anyEnabled) {
    await unregisterDevicePushToken(userId);
    return null;
  }

  return registerDevicePushToken(userId);
}

export type PushNotificationPayload = {
  type?: string;
  audience?: string;
  orderId?: string;
  chatId?: string;
  senderId?: string;
  notificationId?: string;
};

export function extractPushNotificationData(
  response: ExpoNotifications.NotificationResponse | ExpoNotifications.Notification,
): PushNotificationPayload {
  const content =
    'notification' in response ? response.notification.request.content : response.request.content;
  const data = content.data ?? {};

  return {
    type: typeof data.type === 'string' ? data.type : undefined,
    audience: typeof data.audience === 'string' ? data.audience : undefined,
    orderId: typeof data.orderId === 'string' ? data.orderId : undefined,
    chatId: typeof data.chatId === 'string' ? data.chatId : undefined,
    senderId: typeof data.senderId === 'string' ? data.senderId : undefined,
    notificationId:
      typeof data.notificationId === 'string' ? data.notificationId : undefined,
  };
}

export function extractChatNotificationData(
  response: ExpoNotifications.NotificationResponse | ExpoNotifications.Notification,
): { chatId?: string; senderId?: string } {
  const data = extractPushNotificationData(response);
  return { chatId: data.chatId, senderId: data.senderId };
}

export function addNotificationResponseListener(
  listener: (response: ExpoNotifications.NotificationResponse) => void,
): PushEventSubscription {
  const Notifications = loadExpoNotificationsModule();
  if (!Notifications) {
    return { remove: () => undefined };
  }

  return Notifications.addNotificationResponseReceivedListener(listener);
}

export function addNotificationReceivedListener(
  listener: (notification: ExpoNotifications.Notification) => void,
): PushEventSubscription {
  const Notifications = loadExpoNotificationsModule();
  if (!Notifications) {
    return { remove: () => undefined };
  }

  return Notifications.addNotificationReceivedListener(listener);
}

export async function getInitialNotificationResponse(): Promise<ExpoNotifications.NotificationResponse | null> {
  const Notifications = loadExpoNotificationsModule();
  if (!Notifications) {
    return null;
  }

  return Notifications.getLastNotificationResponseAsync();
}
