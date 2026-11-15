import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchChatMessages } from '../api/chatApi';
import type { ChatMessage, ChatSummary } from '../types/chat';
import {
  buildTempChat,
  findExistingChatWithReceiver,
  getParticipantId,
  isTempChatId,
  normalizeParticipantIds,
} from '../utils/chatDisplay';
import {
  connectChatSocket,
  deleteChatMessage,
  editChatMessage,
  ensureChatSocketConnected,
  getChatSocket,
  joinChatRoom,
  markChatMessageRead,
  sendChatMessage,
  toggleChatReaction,
} from '../../../services/socket/chatSocket';
import { emitChatUnreadEvent } from '../utils/chatUnreadEvents';
import { getErrorMessage } from '../../../services/api/errors';

interface UseChatThreadOptions {
  userId?: string;
  chatId?: string;
  receiverId?: string;
  inboxChats?: ChatSummary[];
  viewerRole?: string;
}

function createOptimisticMessage(chatId: string, senderId: string, text: string): ChatMessage {
  return {
    _id: `local-${Date.now()}`,
    chatId,
    sender: senderId,
    text,
    createdAt: new Date().toISOString(),
    readBy: [senderId],
    optimistic: true,
    failed: false,
  };
}

export function useChatThread(options: UseChatThreadOptions) {
  const { userId, chatId, receiverId, inboxChats = [], viewerRole } = options;

  const resolvedChat = useMemo(() => {
    if (!userId) {
      return undefined;
    }

    if (chatId && !isTempChatId(chatId)) {
      return inboxChats.find((chat) => chat._id === chatId);
    }

    if (receiverId) {
      const existing = findExistingChatWithReceiver(inboxChats, userId, receiverId);
      if (existing) {
        return existing;
      }

      return buildTempChat(userId, receiverId);
    }

    if (chatId && isTempChatId(chatId)) {
      return inboxChats.find((item) => item._id === chatId) ?? buildTempChat(userId, chatId.split('-').slice(2).join('-'));
    }

    return undefined;
  }, [chatId, inboxChats, receiverId, userId]);

  const activeChatId = resolvedChat?._id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(Boolean(activeChatId));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const [wasDeleted, setWasDeleted] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const lastMarkedReadRef = useRef<string | null>(null);

  const refreshMessages = useCallback(async () => {
    if (!userId || !activeChatId) {
      setMessages([]);
      setHasLoadedOnce(false);
      setIsRefreshing(false);
      return;
    }

    if (isTempChatId(activeChatId)) {
      setMessages([]);
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    const version = requestVersionRef.current + 1;
    requestVersionRef.current = version;
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetchChatMessages(activeChatId);
      if (requestVersionRef.current !== version) {
        return;
      }

      setMessages(Array.isArray(response.messages) ? response.messages : []);
      setHasOlder(Boolean(response.hasMore));
      setHasLoadedOnce(true);
    } catch (caught) {
      if (requestVersionRef.current !== version) {
        return;
      }

      setError(getErrorMessage(caught, 'Could not load conversation'));
    } finally {
      if (requestVersionRef.current === version) {
        setIsRefreshing(false);
      }
    }
  }, [activeChatId, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    connectChatSocket(userId);
  }, [userId]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    joinChatRoom(activeChatId);
    void refreshMessages();
  }, [activeChatId, refreshMessages]);

  // Opening a chat marks it read. Before, only messages that arrived while the thread was open
  // were marked, so anything already waiting stayed "unread" forever. The server clears the
  // chat's unread count when any message in it is marked read, so the newest unread is enough.
  useEffect(() => {
    if (!userId || !activeChatId || isTempChatId(activeChatId) || !hasLoadedOnce) {
      return;
    }

    const lastUnread = [...messages]
      .reverse()
      .find(
        (message) =>
          message.sender !== userId &&
          !message.optimistic &&
          !message._id.startsWith('local-') &&
          !(message.readBy ?? []).includes(userId),
      );

    const chatHasUnread = (resolvedChat?.unreadCount ?? 0) > 0;
    const target = lastUnread ?? (chatHasUnread ? [...messages].reverse().find((m) => m.sender !== userId) : undefined);
    if (!target || lastMarkedReadRef.current === target._id) {
      return;
    }

    lastMarkedReadRef.current = target._id;
    void ensureChatSocketConnected().then(() => {
      markChatMessageRead({ messageId: target._id, userId, chatId: activeChatId });
    });
    setMessages((current) =>
      current.map((message) =>
        message.sender !== userId && !(message.readBy ?? []).includes(userId)
          ? { ...message, readBy: [...(message.readBy ?? []), userId] }
          : message,
      ),
    );
    emitChatUnreadEvent({ type: 'read', chatId: activeChatId });
  }, [activeChatId, hasLoadedOnce, messages, resolvedChat?.unreadCount, userId]);

  // Live edits, deletions and reactions from either participant.
  useEffect(() => {
    if (!activeChatId || isTempChatId(activeChatId)) {
      return;
    }

    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    const replaceMessage = (updated: ChatMessage) => {
      if (!updated?._id) return;
      setMessages((current) =>
        current.map((message) =>
          message._id === updated._id ? { ...message, ...updated, chatId: message.chatId } : message,
        ),
      );
    };
    const handleDeleted = ({ messageId }: { messageId?: string }) => {
      if (!messageId) return;
      setMessages((current) =>
        current.map((message) =>
          message._id === messageId ? { ...message, isDeleted: true } : message,
        ),
      );
    };
    const handleChatDeleted = ({ chatId: deletedId }: { chatId?: string }) => {
      if (deletedId && String(deletedId) === activeChatId) {
        setWasDeleted(true);
      }
    };

    socket.on('message_edited', replaceMessage);
    socket.on('reaction_added', replaceMessage);
    socket.on('message_deleted', handleDeleted);
    socket.on('chat_deleted', handleChatDeleted);

    return () => {
      socket.off('message_edited', replaceMessage);
      socket.off('reaction_added', replaceMessage);
      socket.off('message_deleted', handleDeleted);
      socket.off('chat_deleted', handleChatDeleted);
    };
  }, [activeChatId]);

  useEffect(() => {
    if (!userId || !activeChatId) {
      return;
    }

    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    const handleNewMessage = (message: ChatMessage & { chatId?: string }) => {
      const incomingChatId = message.chatId;
      if (!incomingChatId) {
        return;
      }

      const matchesActiveChat =
        incomingChatId === activeChatId || (isTempChatId(activeChatId) && message.sender !== userId);

      if (!matchesActiveChat && !isTempChatId(activeChatId)) {
        return;
      }

      if (isTempChatId(activeChatId) && incomingChatId !== activeChatId) {
        joinChatRoom(incomingChatId);
      }

      setMessages((current) => {
        const withoutMatchingOptimistic = current.filter(
          (item) => !(item.optimistic && item.text === message.text && item.sender === message.sender),
        );

        if (withoutMatchingOptimistic.some((item) => item._id === message._id)) {
          return withoutMatchingOptimistic;
        }

        return [...withoutMatchingOptimistic, { ...message, chatId: incomingChatId }];
      });

      if (message.sender !== userId && message._id) {
        markChatMessageRead({
          messageId: message._id,
          userId,
          chatId: incomingChatId,
        });
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [activeChatId, userId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !userId || !resolvedChat || isSending) {
        return false;
      }

      const participants = normalizeParticipantIds(resolvedChat.participants);
      if (!participants.length && resolvedChat.receiverId) {
        participants.push(userId, resolvedChat.receiverId);
      }

      const optimistic = createOptimisticMessage(resolvedChat._id, userId, trimmed);
      setMessages((current) => [...current, optimistic]);
      setIsSending(true);
      setError(null);

      try {
        const response = await sendChatMessage({
          chatId: resolvedChat._id,
          senderId: userId,
          text: trimmed,
          participants,
        });

        if (response.status !== 'ok' || !response.message) {
          throw new Error(response.error || 'Message failed to send');
        }

        const realChatId = response.chatId ?? response.message.chatId ?? resolvedChat._id;
        joinChatRoom(realChatId);

        setMessages((current) => {
          const withoutOptimistic = current.filter((item) => item._id !== optimistic._id);
          if (withoutOptimistic.some((item) => item._id === response.message!._id)) {
            return withoutOptimistic;
          }

          return [
            ...withoutOptimistic,
            {
              ...response.message!,
              chatId: realChatId,
            },
          ];
        });

        return true;
      } catch (caught) {
        setMessages((current) =>
          current.map((item) =>
            item._id === optimistic._id
              ? {
                  ...item,
                  optimistic: false,
                  failed: true,
                }
              : item,
          ),
        );
        setError(getErrorMessage(caught, 'Message failed to send'));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [isSending, resolvedChat, userId],
  );

  const title = useMemo(() => {
    if (!resolvedChat || !userId) {
      return 'Messages';
    }

    const other = resolvedChat.participants.find(
      (participant) => getParticipantId(participant) !== userId,
    );

    if (typeof other === 'object' && other) {
      if (viewerRole === 'seller' || other.userRole === 'seller') {
        return other.storeTitle?.trim() || other.firstName?.trim() || other.email?.trim() || 'Seller';
      }

      return other.firstName?.trim() || other.email?.trim() || 'Customer';
    }

    return 'Messages';
  }, [resolvedChat, userId, viewerRole]);

  /** Loads the page of messages before the oldest one shown. */
  const loadOlderMessages = useCallback(async () => {
    if (!activeChatId || isTempChatId(activeChatId) || isLoadingOlder || !hasOlder) return;

    const loadedFromServer = messages.filter(
      (message) => !message.optimistic && !message._id.startsWith('local-'),
    ).length;

    setIsLoadingOlder(true);
    try {
      const response = await fetchChatMessages(activeChatId, { skip: loadedFromServer });
      const older = Array.isArray(response.messages) ? response.messages : [];
      setMessages((current) => {
        const known = new Set(current.map((message) => message._id));
        return [...older.filter((message) => !known.has(message._id)), ...current];
      });
      setHasOlder(Boolean(response.hasMore));
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not load earlier messages'));
    } finally {
      setIsLoadingOlder(false);
    }
  }, [activeChatId, hasOlder, isLoadingOlder, messages]);

  const editMessage = useCallback(
    async (messageId: string, nextText: string) => {
      const trimmed = nextText.trim();
      if (!trimmed) return false;

      const previous = messages.find((message) => message._id === messageId);
      setMessages((current) =>
        current.map((message) =>
          message._id === messageId ? { ...message, text: trimmed, edited: true } : message,
        ),
      );

      const response = await editChatMessage(messageId, trimmed);
      if (response.status !== 'ok') {
        if (previous) {
          setMessages((current) =>
            current.map((message) => (message._id === messageId ? previous : message)),
          );
        }
        setError(response.error || 'Could not edit message');
        return false;
      }
      return true;
    },
    [messages],
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((current) =>
      current.map((message) =>
        message._id === messageId ? { ...message, isDeleted: true } : message,
      ),
    );
    const result = await deleteChatMessage(messageId);
    if (result.status !== 'ok') {
      setError(result.error || 'Could not delete message.');
      void refreshMessages();
    }
  }, [refreshMessages]);

  const toggleReaction = useCallback(
    async (messageId: string, type: string) => {
      if (!userId) return;
      // Same rule as the server: one reaction per user; picking the same one removes it.
      setMessages((current) =>
        current.map((message) => {
          if (message._id !== messageId) return message;
          const reactions = message.reactions ?? [];
          const mine = reactions.find((reaction) => String(reaction.user) === userId);
          const others = reactions.filter((reaction) => String(reaction.user) !== userId);
          return {
            ...message,
            reactions: mine?.type === type ? others : [...others, { user: userId, type }],
          };
        }),
      );
      const result = await toggleChatReaction(messageId, type);
      if (result.status !== 'ok') {
        setError(result.error || 'Could not react.');
        void refreshMessages();
      }
    },
    [refreshMessages, userId],
  );

  return {
    hasOlder,
    isLoadingOlder,
    loadOlderMessages,
    editMessage,
    deleteMessage,
    toggleReaction,
    wasDeleted,
    chat: resolvedChat,
    chatId: activeChatId,
    title,
    messages,
    hasLoadedOnce,
    isRefreshing,
    isSending,
    error,
    refreshMessages,
    sendMessage,
  };
}
