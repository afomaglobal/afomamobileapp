import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import type { ChatAttachment, ChatMessage } from '../types/chat';
import { ChatAttachmentView } from './ChatAttachmentView';

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onLongPress?: (message: ChatMessage) => void;
  /** Tapping a reaction chip toggles that reaction for the current user. */
  onReactionPress?: (message: ChatMessage, type: string) => void;
  currentUserId?: string;
  /** Tap on a failed own message resends it. */
  onRetry?: (message: ChatMessage) => void;
  /** Open a photo full-screen or a file/video in the browser. */
  onOpenAttachment?: (attachment: ChatAttachment) => void;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function groupReactions(reactions: ChatMessage['reactions']) {
  const groups = new Map<string, { type: string; count: number; users: string[] }>();
  for (const reaction of reactions ?? []) {
    if (!reaction?.type) continue;
    const group = groups.get(reaction.type) ?? { type: reaction.type, count: 0, users: [] };
    group.count += 1;
    group.users.push(String(reaction.user));
    groups.set(reaction.type, group);
  }
  return [...groups.values()];
}

export function ChatMessageBubble({
  message,
  isOwn,
  onLongPress,
  onReactionPress,
  currentUserId,
  onRetry,
  onOpenAttachment,
}: ChatMessageBubbleProps) {
  const isDeleted = Boolean(message.isDeleted);
  const attachments = isDeleted ? [] : message.attachments ?? [];
  const label = isDeleted ? 'This message was deleted' : message.text?.trim() ?? '';
  const isUploading = Boolean(message.optimistic && message.localFile);
  const reactions = isDeleted ? [] : groupReactions(message.reactions);
  const canLongPress = Boolean(onLongPress) && !isDeleted && !message.optimistic && !message.failed;
  const canRetry = Boolean(onRetry) && Boolean(message.failed) && isOwn;
  const timeLabel = message.optimistic
    ? isUploading
      ? 'Uploading…'
      : 'Sending…'
    : message.failed
      ? onRetry
        ? 'Not sent · Tap to retry'
        : 'Not sent'
      : `${message.edited && !isDeleted ? 'Edited · ' : ''}${formatTime(message.createdAt)}`;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <Pressable
        disabled={!canLongPress && !canRetry}
        onPress={canRetry ? () => onRetry?.(message) : undefined}
        onLongPress={canLongPress ? () => onLongPress?.(message) : undefined}
        accessibilityRole={canRetry ? 'button' : undefined}
        accessibilityLabel={canRetry ? 'Message not sent. Tap to retry.' : undefined}
        delayLongPress={300}
        accessibilityHint={canLongPress ? 'Long press for message options' : undefined}
        style={({ pressed }) => [
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          message.failed && styles.failed,
          isDeleted && styles.bubbleDeleted,
          pressed && canLongPress && styles.pressed,
        ]}
      >
        {attachments.map((attachment) => (
          <ChatAttachmentView
            key={attachment.url}
            attachment={attachment}
            isOwn={isOwn}
            uploading={isUploading}
            localSize={message.localFile}
            onOpen={canRetry ? () => onRetry?.(message) : onOpenAttachment}
            onLongPress={canLongPress ? () => onLongPress?.(message) : undefined}
          />
        ))}
        {label ? (
          <AppText
            variant="body"
            style={[
              styles.text,
              isOwn ? styles.textOwn : styles.textOther,
              isDeleted && styles.textDeleted,
            ]}
          >
            {label}
          </AppText>
        ) : null}
        <AppText variant="caption" style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther, isDeleted && styles.textDeleted]}>
          {timeLabel}
        </AppText>
      </Pressable>

      {reactions.length > 0 ? (
        <View style={[styles.reactions, isOwn ? styles.reactionsOwn : styles.reactionsOther]}>
          {reactions.map((group) => {
            const mine = Boolean(currentUserId && group.users.includes(currentUserId));
            return (
              <Pressable
                key={group.type}
                accessibilityRole="button"
                accessibilityLabel={`${group.type} ${group.count}${mine ? ', tap to remove yours' : ''}`}
                onPress={() => onReactionPress?.(message, group.type)}
                style={[styles.reactionChip, mine && styles.reactionChipMine]}
              >
                <AppText variant="caption">
                  {group.type}
                  {group.count > 1 ? ` ${group.count}` : ''}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.large,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.small,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: radius.small,
  },
  failed: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  bubbleDeleted: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  textDeleted: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: -6,
    maxWidth: '82%',
  },
  reactionsOwn: {
    justifyContent: 'flex-end',
    marginRight: spacing.sm,
  },
  reactionsOther: {
    marginLeft: spacing.sm,
  },
  reactionChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  reactionChipMine: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  text: {
    lineHeight: 20,
  },
  textOwn: {
    color: colors.background,
  },
  textOther: {
    color: colors.textPrimary,
  },
  time: {
    alignSelf: 'flex-end',
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.78)',
  },
  timeOther: {
    color: colors.textMuted,
  },
});
