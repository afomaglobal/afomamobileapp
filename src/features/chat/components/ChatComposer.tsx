import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';

export interface ChatComposerProps {
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
  isSending?: boolean;
  /** When set, the composer edits this message instead of sending a new one. */
  editing?: { messageId: string; text: string } | null;
  onSaveEdit?: (messageId: string, text: string) => Promise<boolean>;
  onCancelEdit?: () => void;
  /** Shows the attach button when provided. */
  onAttachPress?: () => void;
}

export function ChatComposer({
  onSend,
  disabled = false,
  isSending = false,
  editing = null,
  onSaveEdit,
  onCancelEdit,
  onAttachPress,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const [draftBeforeEdit, setDraftBeforeEdit] = useState('');
  const inputRef = useRef<TextInput>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const isEditing = Boolean(editing);

  useEffect(() => {
    if (editing) {
      setDraftBeforeEdit(textRef.current);
      setText(editing.text);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // Only when a different message enters edit mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.messageId]);

  const cancelEdit = () => {
    setText(draftBeforeEdit);
    setDraftBeforeEdit('');
    onCancelEdit?.();
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }

    if (editing && onSaveEdit) {
      if (trimmed === editing.text.trim()) {
        cancelEdit();
        return;
      }
      const saved = await onSaveEdit(editing.messageId, trimmed);
      if (saved) {
        setText(draftBeforeEdit);
        setDraftBeforeEdit('');
      }
      return;
    }

    const sent = await onSend(trimmed);
    if (sent) {
      setText('');
    }
  };

  return (
    <View>
      {isEditing ? (
        <View style={styles.editBar}>
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <AppText variant="caption" style={styles.editLabel} numberOfLines={1}>
            Editing message
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            onPress={cancelEdit}
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    <View style={styles.container}>
      {onAttachPress && !isEditing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach a photo, video or file"
          onPress={onAttachPress}
          disabled={disabled}
          hitSlop={6}
          style={({ pressed }) => [
            styles.attachButton,
            disabled && styles.sendButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="attach" size={24} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Write a message…"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        editable={!disabled && !isSending}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isEditing ? 'Save edited message' : 'Send message'}
        onPress={() => {
          void handleSend();
        }}
        disabled={disabled || isSending || !text.trim()}
        style={({ pressed }) => [
          styles.sendButton,
          (disabled || isSending || !text.trim()) && styles.sendButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        {isSending ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <AppText variant="bodyMedium" style={styles.sendLabel}>
            {isEditing ? 'Save' : 'Send'}
          </AppText>
        )}
      </Pressable>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  editLabel: {
    flex: 1,
    color: colors.primary,
    fontWeight: '600',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.large,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  attachButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    minWidth: 72,
    height: 44,
    borderRadius: radius.large,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
