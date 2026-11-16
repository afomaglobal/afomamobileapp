import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import type { ChatAttachment } from '../types/chat';

const IMAGE_MAX_WIDTH = 220;
const IMAGE_MAX_HEIGHT = 280;

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageAttachment(attachment: ChatAttachment): boolean {
  return Boolean(attachment.fileType?.startsWith('image/'));
}

export interface ChatAttachmentViewProps {
  attachment: ChatAttachment;
  isOwn: boolean;
  uploading?: boolean;
  /** Known size of a local photo, for the right aspect ratio before upload finishes. */
  localSize?: { width?: number; height?: number };
  onOpen?: (attachment: ChatAttachment) => void;
  onLongPress?: () => void;
}

export function ChatAttachmentView({
  attachment,
  isOwn,
  uploading = false,
  localSize,
  onOpen,
  onLongPress,
}: ChatAttachmentViewProps) {
  const [failed, setFailed] = useState(false);
  const isImage = isImageAttachment(attachment);
  const isVideo = attachment.fileType?.startsWith('video/');

  if (isImage && !failed) {
    const ratio =
      localSize?.width && localSize?.height ? localSize.width / localSize.height : 4 / 3;
    let width = IMAGE_MAX_WIDTH;
    let height = width / ratio;
    if (height > IMAGE_MAX_HEIGHT) {
      height = IMAGE_MAX_HEIGHT;
      width = height * ratio;
    }

    return (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Photo ${attachment.fileName ?? ''}`.trim()}
        disabled={uploading}
        onPress={() => onOpen?.(attachment)}
        onLongPress={onLongPress}
        delayLongPress={300}
      >
        <Image
          source={{ uri: attachment.url }}
          style={[styles.image, { width, height }]}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
        {uploading ? (
          <View style={styles.imageOverlay}>
            <ActivityIndicator color={colors.textInverse} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  const size = formatSize(attachment.size);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${attachment.fileName || 'file'}`}
      disabled={uploading}
      onPress={() => onOpen?.(attachment)}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.file,
        isOwn ? styles.fileOwn : styles.fileOther,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.fileIcon}>
        {uploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={isVideo ? 'play-circle-outline' : 'document-text-outline'}
            size={24}
            color={colors.primary}
          />
        )}
      </View>
      <View style={styles.fileText}>
        <AppText
          variant="bodySmall"
          numberOfLines={2}
          style={[styles.fileName, isOwn ? styles.textOwn : styles.textOther]}
        >
          {attachment.fileName || (isVideo ? 'Video' : 'File')}
        </AppText>
        <AppText variant="caption" style={isOwn ? styles.metaOwn : styles.metaOther}>
          {uploading ? 'Uploading…' : [isVideo ? 'Video' : 'Tap to open', size].filter(Boolean).join(' · ')}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.medium,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.medium,
    minWidth: 200,
    maxWidth: 240,
  },
  fileOwn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fileOther: {
    backgroundColor: colors.surface,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fileName: {
    fontWeight: '600',
  },
  textOwn: {
    color: colors.background,
  },
  textOther: {
    color: colors.textPrimary,
  },
  metaOwn: {
    color: 'rgba(255,255,255,0.78)',
  },
  metaOther: {
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.8,
  },
});
