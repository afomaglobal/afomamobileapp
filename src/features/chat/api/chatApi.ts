import { apiDelete, apiGet } from '../../../services/api/request';
import type { ChatMessage, ChatSummary } from '../types/chat';

interface UserChatsResponse {
  chats: ChatSummary[];
}

interface ChatMessagesResponse {
  chatId: string;
  /** Oldest → newest. Page 0 (skip 0) is the newest messages. */
  messages: ChatMessage[];
  /** True when older messages exist beyond this page (newer backends only). */
  hasMore?: boolean;
}

export async function fetchUserChats(userId: string): Promise<ChatSummary[]> {
  const response = await apiGet<UserChatsResponse>(
    `/api/chats/${encodeURIComponent(userId)}`,
    undefined,
    'Could not load messages',
  );

  return Array.isArray(response.chats) ? response.chats : [];
}

export async function fetchChatMessages(
  chatId: string,
  options?: { skip?: number; limit?: number },
): Promise<ChatMessagesResponse> {
  const skip = options?.skip ?? 0;
  const limit = options?.limit ?? 50;

  return apiGet<ChatMessagesResponse>(
    `/api/chats/${encodeURIComponent(chatId)}/messages?skip=${skip}&limit=${limit}`,
    undefined,
    'Could not load conversation',
  );
}

export async function deleteChat(chatId: string): Promise<void> {
  await apiDelete(`/api/chats/${encodeURIComponent(chatId)}`, undefined, 'Could not delete chat');
}
