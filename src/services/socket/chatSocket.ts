// Bundled build — Metro cannot resolve engine.io-client ESM transport subpaths in RN.
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';

import { env } from '../../app/config/env';
import { getSessionAccessTokenSync } from '../api/sessionAccessToken';
import type { ChatMessage, SendMessageAck } from '../../features/chat/types/chat';

let socket: Socket | null = null;
let joinedUserId: string | null = null;

function normalizeSocketUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\/[^/]+/.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  if (/^https?:[^/]/.test(trimmed)) {
    return trimmed.replace(/^(https?):/, '$1://').replace(/\/$/, '');
  }

  return undefined;
}

function getSocketUrl(): string | undefined {
  return normalizeSocketUrl(env.socketUrl || env.apiUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function connectChatSocket(userId: string): Socket | null {
  const socketUrl = getSocketUrl();
  if (!socketUrl || !userId) {
    return null;
  }

  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      // Match web: polling first, then upgrade. WebSocket-only often fails behind nginx on RN.
      transports: ['polling', 'websocket'],
      connectTimeout: 10000,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      // Sent on every (re)connect; the server uses it to decide who this socket is.
      auth: (cb: (data: { token: string }) => void) => cb({ token: getSessionAccessTokenSync() ?? '' }),
    });
  }

  const activeSocket = socket;

  const emitJoin = () => {
    activeSocket.emit('join', { userId });
  };

  activeSocket.off('connect');
  activeSocket.on('connect', emitJoin);

  joinedUserId = userId;

  if (!activeSocket.connected) {
    activeSocket.connect();
  } else {
    emitJoin();
  }

  return activeSocket;
}

export async function ensureChatSocketConnected(
  maxAttempts = 12,
  delayMs = 250,
): Promise<Socket | null> {
  const activeSocket = socket;
  if (!activeSocket) {
    return null;
  }

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  let attempts = 0;
  while (attempts < maxAttempts) {
    if (activeSocket.connected) {
      return activeSocket;
    }

    await sleep(delayMs);
    attempts += 1;
  }

  return activeSocket.connected ? activeSocket : null;
}

export function disconnectChatSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    if (socket.connected) {
      socket.disconnect();
    }
    socket = null;
  }

  joinedUserId = null;
}

export function joinChatRoom(chatId: string): void {
  if (!chatId) {
    return;
  }

  socket?.emit('join_chat', { chatId });
}

export async function sendChatMessage(payload: {
  chatId: string;
  senderId: string;
  text: string;
  participants: string[];
  attachments?: ChatMessage['attachments'];
}): Promise<SendMessageAck> {
  const activeSocket = await ensureChatSocketConnected();
  if (!activeSocket?.connected) {
    return { status: 'error', error: 'Chat connection unavailable' };
  }

  return new Promise((resolve) => {
    activeSocket.emit('send_message', payload, (response: SendMessageAck) => {
      resolve(response ?? { status: 'error', error: 'No response from server' });
    });
  });
}

export function markChatMessageRead(payload: {
  messageId: string;
  userId: string;
  chatId: string;
}): void {
  socket?.emit('message_read', payload);
}

export function getJoinedChatUserId(): string | null {
  return joinedUserId;
}


/** Asks the server for the user's total unread chat messages across all chats. */
export async function requestChatUnreadTotal(userId: string): Promise<number | null> {
  const activeSocket = await ensureChatSocketConnected();
  if (!activeSocket?.connected || !userId) {
    return null;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 8000);
    activeSocket.emit('get_unread_total', { userId }, (response?: { total?: number }) => {
      clearTimeout(timeout);
      resolve(typeof response?.total === 'number' ? response.total : null);
    });
  });
}

export async function editChatMessage(
  messageId: string,
  text: string,
): Promise<{ status: 'ok' | 'error'; message?: ChatMessage; error?: string }> {
  const activeSocket = await ensureChatSocketConnected();
  if (!activeSocket?.connected) {
    return { status: 'error', error: 'Chat connection unavailable' };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(
      () => resolve({ status: 'error', error: 'No response from server' }),
      10000,
    );
    activeSocket.emit(
      'edit_message',
      { messageId, text },
      (response?: { status: 'ok' | 'error'; message?: ChatMessage; error?: string }) => {
        clearTimeout(timeout);
        resolve(response ?? { status: 'error', error: 'No response from server' });
      },
    );
  });
}

type ChatAck = { status: 'ok' | 'error'; error?: string };

async function emitWithAck(event: string, payload: Record<string, unknown>): Promise<ChatAck> {
  const activeSocket = await ensureChatSocketConnected();
  if (!activeSocket?.connected) {
    return { status: 'error', error: 'Chat connection unavailable' };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(
      () => resolve({ status: 'error', error: 'No response from server' }),
      10000,
    );
    activeSocket.emit(event, payload, (response?: ChatAck) => {
      clearTimeout(timeout);
      resolve(response ?? { status: 'error', error: 'No response from server' });
    });
  });
}

/** Deletes one of your own messages; the server broadcasts `message_deleted` to the chat. */
export function deleteChatMessage(messageId: string): Promise<ChatAck> {
  return emitWithAck('delete_message', { messageId });
}

/** Toggles your reaction; the server broadcasts `reaction_added` with the updated message. */
export function toggleChatReaction(messageId: string, type: string): Promise<ChatAck> {
  return emitWithAck('add_reaction', { messageId, type });
}
