import { marketplaceNavigationRef } from '../../app/navigation/marketplaceChrome/marketplaceNavigationRef';

type PendingChatNavigation = {
  chatId?: string;
  senderId?: string;
};

type PendingOrderNavigation = {
  orderId: string;
  audience?: string;
};

let pendingChatNavigation: PendingChatNavigation | null = null;
let pendingBellNavigation = false;
let pendingOrderNavigation: PendingOrderNavigation | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;

function clearRetryTimer() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

function attemptChatNavigation(target: PendingChatNavigation): boolean {
  if (!marketplaceNavigationRef.isReady()) {
    return false;
  }

  marketplaceNavigationRef.navigate('Shopping', {
    screen: 'ChatThread',
    params: target.chatId
      ? { chatId: target.chatId }
      : target.senderId
        ? { receiverId: target.senderId }
        : {},
  });

  pendingChatNavigation = null;
  pendingBellNavigation = false;
  pendingOrderNavigation = null;
  clearRetryTimer();
  return true;
}

function scheduleChatNavigation(target: PendingChatNavigation) {
  pendingChatNavigation = target;
  pendingBellNavigation = false;
  pendingOrderNavigation = null;

  if (attemptChatNavigation(target)) {
    return;
  }

  clearRetryTimer();
  let attempts = 0;
  retryTimer = setInterval(() => {
    attempts += 1;
    if (attemptChatNavigation(target) || attempts >= 30) {
      clearRetryTimer();
    }
  }, 100);
}

function attemptBellNavigation(): boolean {
  if (!marketplaceNavigationRef.isReady()) {
    return false;
  }

  marketplaceNavigationRef.navigate('Shopping', {
    screen: 'BellNotifications',
  });

  pendingBellNavigation = false;
  pendingChatNavigation = null;
  pendingOrderNavigation = null;
  clearRetryTimer();
  return true;
}

function scheduleBellNavigation() {
  pendingBellNavigation = true;
  pendingChatNavigation = null;
  pendingOrderNavigation = null;

  if (attemptBellNavigation()) {
    return;
  }

  clearRetryTimer();
  let attempts = 0;
  retryTimer = setInterval(() => {
    attempts += 1;
    if (attemptBellNavigation() || attempts >= 30) {
      clearRetryTimer();
    }
  }, 100);
}

export function navigateToChatFromPush(chatId?: string, senderId?: string): void {
  if (!chatId && !senderId) {
    navigateToChatListFromPush();
    return;
  }

  scheduleChatNavigation({ chatId, senderId });
}

export function navigateToBellNotificationsFromPush(): void {
  scheduleBellNavigation();
}

function attemptOrderNavigation(target: PendingOrderNavigation): boolean {
  if (!marketplaceNavigationRef.isReady()) {
    return false;
  }

  if (target.audience === 'admin') {
    marketplaceNavigationRef.navigate('Admin', {
      screen: 'AdminOrderDetail',
      params: { orderId: target.orderId },
    });
  } else {
    marketplaceNavigationRef.navigate('Seller', {
      screen: 'SellerOrderDetail',
      params: { orderId: target.orderId },
    });
  }

  pendingOrderNavigation = null;
  pendingChatNavigation = null;
  pendingBellNavigation = false;
  clearRetryTimer();
  return true;
}

function scheduleOrderNavigation(target: PendingOrderNavigation): void {
  pendingOrderNavigation = target;
  pendingChatNavigation = null;
  pendingBellNavigation = false;

  if (attemptOrderNavigation(target)) {
    return;
  }

  clearRetryTimer();
  let attempts = 0;
  retryTimer = setInterval(() => {
    attempts += 1;
    if (attemptOrderNavigation(target) || attempts >= 30) {
      clearRetryTimer();
    }
  }, 100);
}

export function navigateToOrderFromPush(orderId?: string, audience?: string): void {
  if (!orderId?.trim()) {
    if (audience === 'admin') {
      if (!marketplaceNavigationRef.isReady()) {
        return;
      }
      marketplaceNavigationRef.navigate('Admin', { screen: 'AdminOrderManagement' });
      return;
    }

    if (!marketplaceNavigationRef.isReady()) {
      return;
    }
    marketplaceNavigationRef.navigate('Seller', { screen: 'SellerOrders' });
    return;
  }

  scheduleOrderNavigation({ orderId: orderId.trim(), audience });
}

export function navigateToChatListFromPush(): void {
  pendingChatNavigation = null;
  pendingBellNavigation = false;
  pendingOrderNavigation = null;
  clearRetryTimer();

  if (!marketplaceNavigationRef.isReady()) {
    return;
  }

  marketplaceNavigationRef.navigate('Shopping', {
    screen: 'ChatList',
  });
}

export function flushPendingPushNavigation(): void {
  if (pendingOrderNavigation) {
    attemptOrderNavigation(pendingOrderNavigation);
    return;
  }

  if (pendingBellNavigation) {
    attemptBellNavigation();
    return;
  }

  if (!pendingChatNavigation) {
    return;
  }

  attemptChatNavigation(pendingChatNavigation);
}

/** @deprecated Use flushPendingPushNavigation */
export function flushPendingChatNavigation(): void {
  flushPendingPushNavigation();
}
