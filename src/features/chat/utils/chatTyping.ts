import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { getChatSocket, getJoinedChatUserId } from '../../../services/socket/chatSocket';

/**
 * "Jane is typing…" support.
 *
 * Receiving: the server relays `typing` / `stop_typing` from the other participant to our user
 * room, so this works in the chat list as well as an open thread. An entry expires after
 * TYPING_TTL_MS without a new `typing` event (covers lost `stop_typing`, app killed, etc.) and is
 * cleared as soon as that person's message arrives.
 *
 * Sending: `notifyTyping` is throttled to one event per TYPING_SEND_INTERVAL_MS per chat;
 * `notifyStoppedTyping` is sent when the box is emptied, a message is sent, or the screen closes.
 */
const TYPING_TTL_MS = 6000;
const TYPING_SEND_INTERVAL_MS = 2500;

type TypingPayload = { chatId?: string; userId?: string };

// chatId -> (userId -> expiry timer)
const typingByChat = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();
const listeners = new Set<() => void>();
let attachedSocket: Socket | null = null;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function clearTyping(chatId: string, userId: string) {
  const users = typingByChat.get(chatId);
  const timer = users?.get(userId);
  if (!users || !timer) return;
  clearTimeout(timer);
  users.delete(userId);
  if (users.size === 0) typingByChat.delete(chatId);
  notifyListeners();
}

function handleTyping({ chatId, userId }: TypingPayload = {}) {
  if (!chatId || !userId || userId === getJoinedChatUserId()) return;
  let users = typingByChat.get(chatId);
  if (!users) {
    users = new Map();
    typingByChat.set(chatId, users);
  }
  const wasTyping = users.has(userId);
  const existing = users.get(userId);
  if (existing) clearTimeout(existing);
  users.set(
    userId,
    setTimeout(() => clearTyping(chatId, userId), TYPING_TTL_MS),
  );
  if (!wasTyping) notifyListeners();
}

function handleStopTyping({ chatId, userId }: TypingPayload = {}) {
  if (chatId && userId) clearTyping(chatId, userId);
}

function handleNewMessage(message: { chatId?: string; sender?: string } = {}) {
  if (message.chatId && message.sender) clearTyping(String(message.chatId), String(message.sender));
}

/** Attach the socket listeners once (the socket object is reused across reconnects). */
function ensureListeners() {
  const socket = getChatSocket();
  if (!socket || socket === attachedSocket) return;
  if (attachedSocket) {
    attachedSocket.off('typing', handleTyping);
    attachedSocket.off('stop_typing', handleStopTyping);
    attachedSocket.off('new_message', handleNewMessage);
  }
  socket.on('typing', handleTyping);
  socket.on('stop_typing', handleStopTyping);
  socket.on('new_message', handleNewMessage);
  attachedSocket = socket;
}

function useTypingVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    ensureListeners();
    // The socket may be created a moment after this screen mounts.
    const retry = setInterval(ensureListeners, 2000);
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      clearInterval(retry);
      listeners.delete(listener);
    };
  }, []);
  return version;
}

/** User ids currently typing in this chat (never includes me). */
export function useTypingUserIds(chatId: string | undefined): string[] {
  useTypingVersion();
  if (!chatId) return [];
  return [...(typingByChat.get(chatId)?.keys() ?? [])];
}

/** Chat ids where someone (not me) is typing — for the chat list. */
export function useTypingChatIds(): Set<string> {
  useTypingVersion();
  return new Set(typingByChat.keys());
}

const lastSentAt = new Map<string, number>();

export function notifyTyping(chatId: string | undefined) {
  if (!chatId || chatId.startsWith('temp-')) return;
  const now = Date.now();
  if (now - (lastSentAt.get(chatId) ?? 0) < TYPING_SEND_INTERVAL_MS) return;
  const socket = getChatSocket();
  if (!socket?.connected) return;
  lastSentAt.set(chatId, now);
  socket.emit('typing', { chatId, userId: getJoinedChatUserId() });
}

export function notifyStoppedTyping(chatId: string | undefined) {
  if (!chatId || chatId.startsWith('temp-') || !lastSentAt.has(chatId)) return;
  lastSentAt.delete(chatId);
  const socket = getChatSocket();
  if (!socket?.connected) return;
  socket.emit('stop_typing', { chatId, userId: getJoinedChatUserId() });
}
