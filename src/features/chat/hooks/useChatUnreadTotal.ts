import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  connectChatSocket,
  getChatSocket,
  requestChatUnreadTotal,
} from '../../../services/socket/chatSocket';
import { subscribeChatUnreadEvents } from '../utils/chatUnreadEvents';

/**
 * Live total of unread chat messages for the header Messages badge.
 *
 * Asks the server (`get_unread_total`) on mount, when the app returns to the foreground, and after
 * any chat activity — new message, read, deletion.
 */
export function useChatUnreadTotal(userId?: string) {
  const [total, setTotal] = useState(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (!userId) return;
    // Coalesce bursts (several events in a row) into one request.
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      void requestChatUnreadTotal(userId).then((next) => {
        if (next != null) setTotal(next);
      });
    }, 300);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setTotal(0);
      return;
    }

    connectChatSocket(userId);
    refresh();

    const socket = getChatSocket();
    const onActivity = () => refresh();
    socket?.on('new_message', onActivity);
    socket?.on('message_read', onActivity);
    socket?.on('chat_deleted', onActivity);
    socket?.io.on('reconnect', onActivity);

    const unsubscribeLocal = subscribeChatUnreadEvents(onActivity);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      socket?.off('new_message', onActivity);
      socket?.off('message_read', onActivity);
      socket?.off('chat_deleted', onActivity);
      socket?.io.off('reconnect', onActivity);
      unsubscribeLocal();
      appStateSub.remove();
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [refresh, userId]);

  return { total, refresh };
}
