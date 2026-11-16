import { apiDelete, apiGet } from '../../../services/api/request';
import { apiClient } from '../../../services/api/client';
import { getErrorMessage } from '../../../services/api/errors';
import type { ChatAttachment, LocalChatFile } from '../types/chat';
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

/** Uploads one file for a chat message (same endpoint as the website). Requires sign-in. */
export async function uploadChatAttachment(file: LocalChatFile): Promise<ChatAttachment> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  try {
    const response = await apiClient.post<ChatAttachment>('/api/chats/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    if (!response.data?.url) {
      throw new Error('Upload failed');
    }
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not upload the file'));
  }
}
