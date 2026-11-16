export interface ChatParticipant {
  _id?: string;
  name?: string;
  email?: string;
  storeTitle?: string;
  firstName?: string;
  userRole?: string;
  userProfile?: string;
  missing?: boolean;
}

export interface ChatAttachment {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
}

/** A file picked on this device, before (or while) it is uploaded. */
export interface LocalChatFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface ChatLastMessage {
  _id?: string;
  sender?: string;
  text?: string;
  attachments?: ChatAttachment[];
  createdAt?: string;
  readBy?: string[];
  isDeleted?: boolean;
}

export interface ChatSummary {
  _id: string;
  participants: Array<ChatParticipant | string>;
  lastMessage?: ChatLastMessage | null;
  unreadCount?: number;
  unreadCounts?: Record<string, number>;
  /** I blocked the other person (history stays visible, sending is off). */
  blockedByMe?: boolean;
  /** The other person blocked me. */
  blockedMe?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isTemp?: boolean;
  receiverId?: string;
}

export interface ChatMessage {
  _id: string;
  chatId?: string;
  sender: string;
  text?: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  readBy?: string[];
  deliveredTo?: string[];
  reactions?: Array<{ user: string; type: string }>;
  isDeleted?: boolean;
  edited?: boolean;
  optimistic?: boolean;
  failed?: boolean;
  /** Set on a local message whose file is still uploading / failed to upload (for retry). */
  localFile?: LocalChatFile;
}

export interface SendMessageAck {
  status: 'ok' | 'error';
  message?: ChatMessage;
  chatId?: string;
  error?: string;
  /** No reply from the server in time; the message may or may not have been saved. */
  timedOut?: boolean;
}
