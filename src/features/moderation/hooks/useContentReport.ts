import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';

import { getErrorMessage } from '../../../services/api/errors';
import {
  submitContentReport,
  type ContentReportReason,
  type ContentReportTargetType,
} from '../../../services/api/contentReportsApi';

const REASON_LABELS: Record<ContentReportReason, string> = {
  prohibited: 'Prohibited or illegal item',
  counterfeit: 'Counterfeit or misleading',
  offensive: 'Offensive or inappropriate',
  scam: 'Scam or fraud',
  spam: 'Spam',
  other: 'Something else',
};

export interface UseContentReportOptions {
  isAuthenticated: boolean;
  /** Called when a signed-out user tries to report (e.g. open the login screen). */
  onRequireSignIn: () => void;
}

/**
 * Report listings and reviews to AFOMA support (App Store guideline 1.2: users must be able
 * to flag objectionable user-generated content). Reports create a support ticket and email.
 */
export function useContentReport({ isAuthenticated, onRequireSignIn }: UseContentReportOptions) {
  const busyRef = useRef(false);

  const submit = useCallback(
    async (targetType: ContentReportTargetType, targetId: string, reason: ContentReportReason) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const result = await submitContentReport({ targetType, targetId, reason });
        Alert.alert('Report sent', result.message);
      } catch (error) {
        Alert.alert('Report failed', getErrorMessage(error, 'Could not submit report. Please try again.'));
      } finally {
        busyRef.current = false;
      }
    },
    [],
  );

  const report = useCallback(
    (targetType: ContentReportTargetType, targetId: string | undefined) => {
      if (!targetId) return;
      const noun = targetType === 'product' ? 'listing' : 'review';

      if (!isAuthenticated) {
        Alert.alert(`Report ${noun}`, `Sign in to report this ${noun}.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: onRequireSignIn },
        ]);
        return;
      }

      Alert.alert(
        `Report ${noun}`,
        `Why are you reporting this ${noun}? Our team reviews every report within 24 hours.`,
        [
          ...(Object.entries(REASON_LABELS) as Array<[ContentReportReason, string]>).map(
            ([reason, label]) => ({
              text: label,
              onPress: () => {
                void submit(targetType, targetId, reason);
              },
            }),
          ),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    },
    [isAuthenticated, onRequireSignIn, submit],
  );

  return {
    reportListing: (productId: string | undefined) => report('product', productId),
    reportReview: (reviewId: string | undefined) => report('review', reviewId),
  };
}
