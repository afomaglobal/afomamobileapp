import { apiPost } from './request';

export type ContentReportTargetType = 'product' | 'review';
export type ContentReportReason = 'prohibited' | 'counterfeit' | 'offensive' | 'scam' | 'spam' | 'other';

export interface SubmitContentReportPayload {
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details?: string;
}

export interface SubmitContentReportResponse {
  reportId: string;
  duplicate?: boolean;
  supportContact?: string;
  message: string;
}

/** POST /api/content-reports — report a listing or review (signed-in users). */
export async function submitContentReport(
  payload: SubmitContentReportPayload,
): Promise<SubmitContentReportResponse> {
  return apiPost<SubmitContentReportResponse>(
    '/api/content-reports',
    payload,
    undefined,
    'Failed to submit report',
  );
}
