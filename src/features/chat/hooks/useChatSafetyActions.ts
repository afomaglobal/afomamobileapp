import { useCallback, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { getErrorMessage } from '../../../services/api/errors';
import {
  blockChatUser,
  submitChatReport,
  type ChatReportReason,
} from '../api/chatModerationApi';
import type { ChatActionSheetOption, ChatActionSheetProps } from '../components/ChatActionSheet';

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
  onBlocked?: () => void;
  /** Adds "Delete conversation" to the menu when provided. */
  onDeleteConversation?: () => Promise<void>;
}

type SheetState =
  | { kind: 'closed' }
  | { kind: 'menu' }
  | { kind: 'report'; messageId?: string }
  | { kind: 'block' }
  | { kind: 'deleteChat' }
  | { kind: 'result'; title: string; message: string; after?: () => void };

/**
 * Chat safety flows (report, block, support, delete conversation) rendered in ONE in-app sheet
 * whose content switches between steps — never an alert opening another alert, which is what
 * froze the app before.
 */
export function useChatSafetyActions(options: UseChatSafetyActionsOptions) {
  const { reportedUserId, chatId, onBlocked, onDeleteConversation } = options;
  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });
  const [isBusy, setIsBusy] = useState(false);

  const close = useCallback(() => {
    if (isBusy) return;
    const after = sheet.kind === 'result' ? sheet.after : undefined;
    setSheet({ kind: 'closed' });
    after?.();
  }, [isBusy, sheet]);

  const openSupportEmail = useCallback(() => {
    const subject = encodeURIComponent('AFOMA app support');
    const body = encodeURIComponent(
      chatId ? `Chat ID: ${chatId}\n\nDescribe your concern:` : 'Describe your concern:',
    );
    setSheet({ kind: 'closed' });
    void Linking.openURL(`mailto:${CHAT_SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  }, [chatId]);

  const submitReport = useCallback(
    async (reason: ChatReportReason, messageId?: string) => {
      if (!reportedUserId) return;
      setIsBusy(true);
      try {
        const result = await submitChatReport({ reportedUserId, chatId, messageId, reason });
        setSheet({
          kind: 'result',
          title: 'Report submitted',
          message: `${result.message}\n\nOur team will review this report. You can also email ${result.supportContact || CHAT_SUPPORT_EMAIL}.`,
        });
      } catch (error) {
        setSheet({
          kind: 'result',
          title: 'Report failed',
          message: getErrorMessage(error, 'Could not submit report'),
        });
      } finally {
        setIsBusy(false);
      }
    },
    [chatId, reportedUserId],
  );

  const blockUser = useCallback(async () => {
    if (!reportedUserId) return;
    setIsBusy(true);
    try {
      await blockChatUser(reportedUserId);
      setSheet({
        kind: 'result',
        title: 'User blocked',
        message: 'Messaging with this account is disabled.',
        after: onBlocked,
      });
    } catch (error) {
      setSheet({
        kind: 'result',
        title: 'Block failed',
        message: getErrorMessage(error, 'Could not block user'),
      });
    } finally {
      setIsBusy(false);
    }
  }, [onBlocked, reportedUserId]);

  const deleteConversation = useCallback(async () => {
    if (!onDeleteConversation) return;
    setIsBusy(true);
    try {
      await onDeleteConversation();
      setSheet({ kind: 'closed' });
    } catch (error) {
      setSheet({
        kind: 'result',
        title: 'Delete failed',
        message: getErrorMessage(error, 'Could not delete conversation'),
      });
    } finally {
      setIsBusy(false);
    }
  }, [onDeleteConversation]);

  const sheetProps = useMemo((): ChatActionSheetProps => {
    const base = { visible: sheet.kind !== 'closed', onClose: close, busy: isBusy };

    switch (sheet.kind) {
      case 'menu': {
        const menuOptions: ChatActionSheetOption[] = [];
        if (reportedUserId) {
          menuOptions.push(
            {
              key: 'report',
              label: 'Report user',
              icon: 'flag-outline',
              onPress: () => setSheet({ kind: 'report' }),
            },
            {
              key: 'block',
              label: 'Block user',
              icon: 'ban-outline',
              destructive: true,
              onPress: () => setSheet({ kind: 'block' }),
            },
          );
        }
        if (onDeleteConversation) {
          menuOptions.push({
            key: 'delete',
            label: 'Delete conversation',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setSheet({ kind: 'deleteChat' }),
          });
        }
        menuOptions.push({
          key: 'email',
          label: `Email ${CHAT_SUPPORT_EMAIL}`,
          icon: 'mail-outline',
          onPress: openSupportEmail,
        });
        return { ...base, title: 'Chat options', options: menuOptions };
      }
      case 'report': {
        const messageId = sheet.messageId;
        return {
          ...base,
          title: messageId ? 'Report message' : 'Report user',
          message: 'Tell us what happened. Reports are sent to our support team.',
          options: (Object.entries(REPORT_REASON_LABELS) as Array<[ChatReportReason, string]>).map(
            ([reason, label]) => ({
              key: reason,
              label,
              onPress: () => void submitReport(reason, messageId),
            }),
          ),
        };
      }
      case 'block':
        return {
          ...base,
          title: 'Block user',
          message:
            'You will no longer receive messages from this user. You can contact support if you need help.',
          options: [
            {
              key: 'confirm',
              label: 'Block user',
              icon: 'ban-outline',
              destructive: true,
              onPress: () => void blockUser(),
            },
          ],
        };
      case 'deleteChat':
        return {
          ...base,
          title: 'Delete conversation?',
          message:
            'This removes the conversation and all its messages for both you and the other person. This can’t be undone.',
          options: [
            {
              key: 'confirm',
              label: 'Delete conversation',
              icon: 'trash-outline',
              destructive: true,
              onPress: () => void deleteConversation(),
            },
          ],
        };
      case 'result':
        return { ...base, title: sheet.title, message: sheet.message, options: [], cancelLabel: 'Done' };
      default:
        return { ...base, visible: false };
    }
  }, [
    blockUser,
    close,
    deleteConversation,
    isBusy,
    onDeleteConversation,
    openSupportEmail,
    reportedUserId,
    sheet,
    submitReport,
  ]);

  return {
    isBusy,
    sheetProps,
    openSafetyMenu: useCallback(() => setSheet({ kind: 'menu' }), []),
    openReportReasonPicker: useCallback(
      (messageId?: string) => reportedUserId && setSheet({ kind: 'report', messageId }),
      [reportedUserId],
    ),
    confirmBlockUser: useCallback(
      () => reportedUserId && setSheet({ kind: 'block' }),
      [reportedUserId],
    ),
    openSupportEmail,
  };
}
