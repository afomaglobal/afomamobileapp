import { apiDelete, apiGet, apiPost } from '../../../services/api/request';

export type ChatReportReason = 'harassment' | 'spam' | 'scam' | 'inappropriate' | 'other';

export interface SubmitChatReportPayload {
  reportedUserId: string;
  chatId?: string;
  messageId?: string;
  reason: ChatReportReason;
  details?: string;
}

export interface SubmitChatReportResponse {
  reportId: string;
  supportTicketId: string;
  supportContact: string;
  message: string;
}

export async function submitChatReport(
  payload: SubmitChatReportPayload,
): Promise<SubmitChatReportResponse> {
  return apiPost<SubmitChatReportResponse>(
    '/api/chat-moderation/report',
    payload,
    undefined,
    'Failed to submit report',
  );
}

export async function blockChatUser(blockedUserId: string): Promise<{ blockedUserId: string }> {
  return apiPost<{ blockedUserId: string }>(
    `/api/chat-moderation/block/${encodeURIComponent(blockedUserId)}`,
    {},
    undefined,
    'Failed to block user',
  );
}

export async function unblockChatUser(blockedUserId: string): Promise<{ blockedUserId: string }> {
  return apiDelete<{ blockedUserId: string }>(
    `/api/chat-moderation/block/${encodeURIComponent(blockedUserId)}`,
    undefined,
    'Failed to unblock user',
  );
}

export async function fetchBlockedChatUserIds(): Promise<string[]> {
  const response = await apiGet<{ blockedUserIds: string[] }>(
    '/api/chat-moderation/blocks',
    undefined,
    'Failed to load blocked users',
  );
  return Array.isArray(response.blockedUserIds) ? response.blockedUserIds : [];
}
