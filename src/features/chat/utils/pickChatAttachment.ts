import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { LocalChatFile } from '../types/chat';

export type ChatAttachmentSource = 'library' | 'camera' | 'document';

/** Must match the backend allowlist in routes/chats.js. */
export const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];
/** Allowed extensions per media type (first one is used when the name needs fixing). */
const EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
};

export type PickChatAttachmentResult = { file: LocalChatFile | null; error?: string };

/**
 * The server checks that type and extension agree. iOS can hand us "IMG_1.HEIC" for a photo it
 * already converted to JPEG, so make the extension match the actual type.
 */
function withExtension(name: string, mimeType: string): string {
  const allowed = EXTENSIONS_BY_TYPE[mimeType];
  if (!allowed) return name;
  const match = /\.[a-z0-9]{2,5}$/i.exec(name);
  if (match && allowed.includes(match[0].toLowerCase())) return name;
  const stem = match ? name.slice(0, -match[0].length) : name;
  return `${stem || 'file'}${allowed[0]}`;
}

function tooLarge(size?: number | null): boolean {
  return typeof size === 'number' && size > CHAT_ATTACHMENT_MAX_BYTES;
}

export async function pickChatAttachment(
  source: ChatAttachmentSource,
): Promise<PickChatAttachmentResult> {
  if (source === 'document') {
    const result = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return { file: null };
    if (tooLarge(asset.size)) return { file: null, error: 'File is too large (max 25 MB).' };
    return {
      file: {
        uri: asset.uri,
        name: asset.name || 'document',
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size ?? undefined,
      },
    };
  }

  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      file: null,
      error:
        source === 'camera'
          ? 'Camera permission is needed to take a photo. You can allow it in Settings.'
          : 'Photo library permission is needed to choose a photo. You can allow it in Settings.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: source === 'camera' ? ['images'] : ['images', 'videos'],
    // Below 1 makes iOS re-encode HEIC photos as JPEG, which every viewer (and the website) shows.
    quality: 0.8,
    allowsEditing: false,
    videoMaxDuration: 120,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return { file: null };
  if (tooLarge(asset.fileSize)) return { file: null, error: 'File is too large (max 25 MB).' };

  const isVideo = asset.type === 'video';
  const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
  return {
    file: {
      uri: asset.uri,
      name: withExtension(asset.fileName || (isVideo ? 'video' : 'photo'), mimeType),
      mimeType,
      size: asset.fileSize ?? undefined,
      width: asset.width,
      height: asset.height,
    },
  };
}
