import { useEffect, useRef } from 'react';

import { useAuth } from '../../features/auth/hooks/useAuth';
import { resolveBackendUserDocumentId } from '../../features/auth/utils/resolveBackendUserDocumentId';
import { notifyBellNotificationsRefresh } from '../../features/notifications/utils/notificationRefresh';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  extractPushNotificationData,
  getInitialNotificationResponse,
  syncDevicePushRegistration,
} from './pushNotifications';
import {
  navigateToBellNotificationsFromPush,
  navigateToChatFromPush,
  navigateToChatListFromPush,
  navigateToOrderFromPush,
} from './pushNavigation';

function handleNotificationOpen(data: {
  type?: string;
  audience?: string;
  orderId?: string;
  chatId?: string;
  senderId?: string;
  notificationId?: string;
}) {
  if (data.type === 'order_created') {
    navigateToOrderFromPush(data.orderId, data.audience);
    return;
  }

  if (data.type === 'marketplace_offer') {
    navigateToBellNotificationsFromPush();
    return;
  }

  if (data.chatId || data.senderId) {
    navigateToChatFromPush(data.chatId, data.senderId);
    return;
  }

  navigateToChatListFromPush();
}

export function PushNotificationBootstrap() {
  const { isAuthenticated, user } = useAuth();
  const pushUserId = resolveBackendUserDocumentId(user);
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !pushUserId) {
      registeredTokenRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (cancelled) {
        return;
      }

      try {
        const token = await syncDevicePushRegistration(pushUserId);
        if (!cancelled) {
          registeredTokenRef.current = token;
        }
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (__DEV__) {
          console.warn('Push registration failed:', status ?? error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pushUserId, isAuthenticated]);

  useEffect(() => {
    void (async () => {
      const initial = await getInitialNotificationResponse();
      if (!initial) {
        return;
      }

      handleNotificationOpen(extractPushNotificationData(initial));
    })();
  }, []);

  useEffect(() => {
    const openSubscription = addNotificationResponseListener((response) => {
      handleNotificationOpen(extractPushNotificationData(response));
    });

    const receiveSubscription = addNotificationReceivedListener((notification) => {
      const data = extractPushNotificationData(notification);
      if (data.type === 'marketplace_offer') {
        notifyBellNotificationsRefresh();
      }
    });

    return () => {
      openSubscription.remove();
      receiveSubscription.remove();
    };
  }, []);

  return null;
}
