import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchChatMessages, uploadChatAttachment } from '../api/chatApi';
import type { ChatAttachment, ChatMessage, ChatSummary, LocalChatFile } from '../types/chat';
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

/** After a send timeout: did the server save it anyway? (same text from me, sent just now) */
/** After a timeout on a file message: was it saved with this uploaded file? */
async function findSavedAttachmentCopy(
  chatId: string,
  userId: string,
  attachmentUrl: string,
): Promise<ChatMessage | null> {
  try {
    const response = await fetchChatMessages(chatId, { limit: 20 });
    const match = (response.messages ?? []).find(
      (message) =>
        String(message.sender) === userId &&
        (message.attachments ?? []).some((attachment) => attachment.url === attachmentUrl),
    );
    return match ? { ...match, chatId } : null;
  } catch {
    return null;
  }
}

async function findSavedCopy(
  chatId: string,
  userId: string,
  text: string,
  sentAtIso: string,
): Promise<ChatMessage | null> {
  try {
    const response = await fetchChatMessages(chatId, { limit: 20 });
    const sentAt = new Date(sentAtIso).getTime() - 60_000;
    const match = [...(response.messages ?? [])]
      .reverse()
      .find(
        (message) =>
          String(message.sender) === userId &&
          message.text?.trim() === text &&
          new Date(message.createdAt).getTime() >= sentAt,
      );
    return match ? { ...match, chatId } : null;
  } catch {
    return null;
  }
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

      const serverMessages = Array.isArray(response.messages) ? response.messages : [];
      // Keep messages that are still sending or failed (they only exist on this device).
      setMessages((current) => [
        ...serverMessages,
        ...current.filter(
          (message) => (message.optimistic || message.failed) && message.chatId === activeChatId,
        ),
      ]);
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
          // File messages are matched by id when the server confirms (their text is empty).
          (item) =>
            !(
              item.optimistic &&
              !item.localFile &&
              item.text === message.text &&
              item.sender === message.sender
            ),
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
          // No reply in time: the server may still have saved it. Check before calling it failed.
          if (response.timedOut && !isTempChatId(resolvedChat._id)) {
            const saved = await findSavedCopy(resolvedChat._id, userId, trimmed, optimistic.createdAt);
            if (saved) {
              setMessages((current) => {
                const withoutOptimistic = current.filter((item) => item._id !== optimistic._id);
                return withoutOptimistic.some((item) => item._id === saved._id)
                  ? withoutOptimistic
                  : [...withoutOptimistic, saved];
              });
              return true;
            }
          }
          throw new Error(
            response.timedOut
              ? 'Message not sent. Check your connection and tap it to retry.'
              : response.error || 'Message failed to send',
          );
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
        // The failed bubble keeps the text and offers "Tap to retry", so clear the composer
        // (returning false would leave a duplicate in the input).
        return true;
      } finally {
        setIsSending(false);
      }
    },
    [isSending, resolvedChat, userId],
  );

  /** Upload a picked file and send it as its own message (like the website). */
  const sendAttachment = useCallback(
    async (file: LocalChatFile) => {
      if (!userId || !resolvedChat) return;

      const participants = normalizeParticipantIds(resolvedChat.participants);
      if (!participants.length && resolvedChat.receiverId) {
        participants.push(userId, resolvedChat.receiverId);
      }

      const optimistic: ChatMessage = {
        _id: `local-file-${Date.now()}`,
        chatId: resolvedChat._id,
        sender: userId,
        text: '',
        // Local preview until the upload finishes.
        attachments: [{ url: file.uri, fileName: file.name, fileType: file.mimeType, size: file.size ?? 0 }],
        createdAt: new Date().toISOString(),
        readBy: [userId],
        optimistic: true,
        localFile: file,
      };
      setMessages((current) => [...current, optimistic]);
      setError(null);

      let uploaded: ChatAttachment | null = null;
      try {
        uploaded = await uploadChatAttachment(file);
        const response = await sendChatMessage({
          chatId: resolvedChat._id,
          senderId: userId,
          text: '',
          participants,
          attachments: [uploaded],
        });

        let delivered = response.status === 'ok' ? response.message ?? null : null;
        if (!delivered && response.timedOut && !isTempChatId(resolvedChat._id)) {
          delivered = await findSavedAttachmentCopy(resolvedChat._id, userId, uploaded.url);
        }
        if (!delivered) {
          throw new Error(
            response.timedOut
              ? 'File not sent. Check your connection and tap it to retry.'
              : response.error || 'File failed to send',
          );
        }

        const realChatId = response.chatId ?? delivered.chatId ?? resolvedChat._id;
        joinChatRoom(realChatId);
        setMessages((current) => {
          const withoutOptimistic = current.filter((item) => item._id !== optimistic._id);
          return withoutOptimistic.some((item) => item._id === delivered!._id)
            ? withoutOptimistic
            : [...withoutOptimistic, { ...delivered!, chatId: realChatId }];
        });
      } catch (caught) {
        setMessages((current) =>
          current.map((item) =>
            item._id === optimistic._id ? { ...item, optimistic: false, failed: true } : item,
          ),
        );
        setError(getErrorMessage(caught, 'File failed to send'));
      }
    },
    [resolvedChat, userId],
  );

  /** Resend a message that failed (tap on a "Not sent" bubble). */
  const retryMessage = useCallback(
    async (localId: string) => {
      const failed = messages.find((message) => message._id === localId && message.failed);
      if (!failed) return;
      if (failed.localFile) {
        setMessages((current) => current.filter((message) => message._id !== localId));
        await sendAttachment(failed.localFile);
        return;
      }
      if (!failed.text) return;
      setMessages((current) => current.filter((message) => message._id !== localId));
      await sendMessage(failed.text);
    },
    [messages, sendAttachment, sendMessage],
  );

  // After any (re)connect, re-fetch so messages missed while the connection was down appear.
  useEffect(() => {
    if (!activeChatId || isTempChatId(activeChatId)) return;
    const socket = getChatSocket();
    if (!socket) return;
    const onConnect = () => {
      void refreshMessages();
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [activeChatId, refreshMessages]);

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
    sendAttachment,
    retryMessage,
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
