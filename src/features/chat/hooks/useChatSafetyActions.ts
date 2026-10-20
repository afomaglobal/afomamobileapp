import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { getErrorMessage } from '../../../services/api/errors';
import {
  blockChatUser,
  submitChatReport,
  type ChatReportReason,
} from '../api/chatModerationApi';

export const CHAT_SUPPORT_EMAIL = 'contact@afoma.io';

const REPORT_REASON_LABELS: Record<ChatReportReason, string> = {
  harassment: 'Harassment or bullying',
  spam: 'Spam',
  scam: 'Scam or fraud',
  inappropriate: 'Inappropriate content',
  other: 'Other',
};

export interface UseChatSafetyActionsOptions {
  reportedUserId?: string;
  chatId?: string;
  messageId?: string;
  onBlocked?: () => void;
}

export function useChatSafetyActions(options: UseChatSafetyActionsOptions) {
  const { reportedUserId, chatId, messageId, onBlocked } = options;
  const [isBusy, setIsBusy] = useState(false);

  const openSupportEmail = useCallback(() => {
    const subject = encodeURIComponent('AFOMA app support');
    const body = encodeURIComponent(
      chatId ? `Chat ID: ${chatId}\n\nDescribe your concern:` : 'Describe your concern:',
    );
    void Linking.openURL(`mailto:${CHAT_SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  }, [chatId]);

  const submitReport = useCallback(
    async (reason: ChatReportReason) => {
      if (!reportedUserId || isBusy) {
        return;
      }

      setIsBusy(true);
      try {
        const result = await submitChatReport({
          reportedUserId,
          chatId,
          messageId,
          reason,
        });
        Alert.alert(
          'Report submitted',
          `${result.message}\n\nOur team will review this report. You can also email ${result.supportContact}.`,
        );
      } catch (error) {
        Alert.alert('Report failed', getErrorMessage(error, 'Could not submit report'));
      } finally {
        setIsBusy(false);
      }
    },
    [chatId, isBusy, messageId, reportedUserId],
  );

  const openReportReasonPicker = useCallback(() => {
    if (!reportedUserId) {
      return;
    }

    Alert.alert(
      'Report user',
      'Tell us what happened. Reports are sent to our support team.',
      [
        ...(Object.entries(REPORT_REASON_LABELS) as Array<[ChatReportReason, string]>).map(
          ([reason, label]) => ({
            text: label,
            onPress: () => {
              void submitReport(reason);
            },
          }),
        ),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }, [reportedUserId, submitReport]);

  const confirmBlockUser = useCallback(() => {
    if (!reportedUserId || isBusy) {
      return;
    }

    Alert.alert(
      'Block user',
      'You will no longer receive messages from this user. You can contact support if you need help.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block user',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsBusy(true);
              try {
                await blockChatUser(reportedUserId);
                Alert.alert('User blocked', 'Messaging with this account is disabled.');
                onBlocked?.();
              } catch (error) {
                Alert.alert('Block failed', getErrorMessage(error, 'Could not block user'));
              } finally {
                setIsBusy(false);
              }
            })();
          },
        },
      ],
    );
  }, [isBusy, onBlocked, reportedUserId]);

  const openSafetyMenu = useCallback(() => {
    if (!reportedUserId) {
      return;
    }

    Alert.alert('Chat safety', undefined, [
      { text: 'Report user', onPress: openReportReasonPicker },
      { text: 'Block user', style: 'destructive', onPress: confirmBlockUser },
      { text: `Email ${CHAT_SUPPORT_EMAIL}`, onPress: openSupportEmail },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [confirmBlockUser, openReportReasonPicker, openSupportEmail, reportedUserId]);

  return {
    isBusy,
    openSafetyMenu,
    openReportReasonPicker,
    confirmBlockUser,
    openSupportEmail,
  };
}
