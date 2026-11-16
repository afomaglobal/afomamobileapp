import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardStickyView,
  useKeyboardState,
  useResizeMode,
} from 'react-native-keyboard-controller';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import type { ShoppingStackParamList } from '../../../app/navigation/types';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRequireAuth } from '../../auth/hooks/useRequireAuth';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { ChatComposer } from '../components/ChatComposer';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { useChatInbox } from '../hooks/useChatInbox';
import { useChatThread } from '../hooks/useChatThread';
import { resolveChatUserId } from '../utils/resolveChatUserId';
import { getOtherParticipant, getParticipantId } from '../utils/chatDisplay';
import { useBlockedChatUsers } from '../hooks/useBlockedChatUsers';
import { useChatSafetyActions } from '../hooks/useChatSafetyActions';
import { ChatActionSheet, type ChatActionSheetOption } from '../components/ChatActionSheet';
import { deleteChat } from '../api/chatApi';
import { emitChatUnreadEvent } from '../utils/chatUnreadEvents';
import { isTempChatId } from '../utils/chatDisplay';
import type { ChatAttachment, ChatMessage } from '../types/chat';
import { pickChatAttachment, type ChatAttachmentSource } from '../utils/pickChatAttachment';
import { notifyStoppedTyping, notifyTyping, useTypingUserIds } from '../utils/chatTyping';

/** Same reactions as the website. */
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

type Props = NativeStackScreenProps<ShoppingStackParamList, 'ChatThread'>;

const CHAT_THREAD_RETURN_TO = authReturnTo.messages();
const COMPOSER_FALLBACK_HEIGHT = 72;

export function ChatThreadScreen({ route, navigation }: Props) {
  useResizeMode();

  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { user, role } = useAuth();
  const chatUserId = resolveChatUserId(user);
  const { isAuthorized } = useRequireAuth(CHAT_THREAD_RETURN_TO);
  const { chatId, receiverId } = route.params;
  const { chats } = useChatInbox(isAuthorized ? chatUserId : undefined);
  const [composerHeight, setComposerHeight] = useState(COMPOSER_FALLBACK_HEIGHT);
  const keyboardHeight = useKeyboardState((state) => state.height);

  const {
    chat,
    title,
    messages,
    hasLoadedOnce,
    isSending,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    wasDeleted,
    hasOlder,
    isLoadingOlder,
    loadOlderMessages,
    retryMessage,
    sendAttachment,
  } = useChatThread({
    userId: isAuthorized ? chatUserId : undefined,
    chatId,
    receiverId,
    inboxChats: chats,
    viewerRole: role ?? user?.userRole,
  });

  const bottomInset = keyboardHeight > 0 ? keyboardHeight : insets.bottom;
  const listBottomInset = composerHeight + bottomInset;

  const otherUserId = chatUserId
    ? getParticipantId(getOtherParticipant(chat?.participants, chatUserId)) || receiverId
    : receiverId;

  const {
    isUserBlocked,
    isBlockedByUser,
    refresh: refreshBlockedUsers,
  } = useBlockedChatUsers(Boolean(chatUserId));
  // Blocking only stops new messages: the history stays on screen (needed as evidence for reports).
  const blockedByMe = isUserBlocked(otherUserId);
  const blockedMe = !blockedByMe && (isBlockedByUser(otherUserId) || Boolean(chat?.blockedMe));
  const messagingBlocked = blockedByMe || blockedMe;

  const realChatId = chat?._id && !isTempChatId(chat._id) ? chat._id : undefined;

  // "Jane is typing…"
  const typingUserIds = useTypingUserIds(realChatId);
  const otherIsTyping = typingUserIds.length > 0 && !messagingBlocked;
  const typingName = title && title !== 'Messages' ? title.split(' ')[0] : '';
  const handleComposerTextChange = useCallback(
    (value: string) => {
      if (messagingBlocked) return;
      if (value.trim()) notifyTyping(realChatId);
      else notifyStoppedTyping(realChatId);
    },
    [messagingBlocked, realChatId],
  );
  const sendAndStopTyping = useCallback(
    (text: string) => {
      notifyStoppedTyping(realChatId);
      return sendMessage(text);
    },
    [realChatId, sendMessage],
  );
  useEffect(() => () => notifyStoppedTyping(realChatId), [realChatId]);

  const handleDeleteConversation = useCallback(async () => {
    if (!realChatId) return;
    await deleteChat(realChatId);
    emitChatUnreadEvent({ type: 'deleted', chatId: realChatId });
    navigation.goBack();
  }, [navigation, realChatId]);

  const {
    openSafetyMenu,
    openReportReasonPicker,
    confirmBlockUser,
    isBusy: isSafetyBusy,
    sheetProps: safetySheetProps,
  } = useChatSafetyActions({
    reportedUserId: otherUserId,
    chatId: chat?._id,
    // Stay in the conversation after blocking: the history is kept, only the composer turns off.
    onBlocked: () => {
      void refreshBlockedUsers();
    },
    isBlocked: blockedByMe,
    onUnblocked: () => {
      void refreshBlockedUsers();
    },
    onDeleteConversation: realChatId ? handleDeleteConversation : undefined,
    otherName: title,
  });

  // Long-press menu for a single message.
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState(false);
  const [editing, setEditing] = useState<{ messageId: string; text: string } | null>(null);

  // Attachments
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<ChatAttachment | null>(null);

  const chooseAttachment = useCallback(
    (source: ChatAttachmentSource) => {
      setAttachSheetOpen(false);
      setAttachError(null);
      // Let the sheet finish closing before the system picker opens (iOS drops a picker
      // presented while another modal is dismissing).
      setTimeout(() => {
        void pickChatAttachment(source).then(({ file, error: pickError }) => {
          if (pickError) setAttachError(pickError);
          if (file) void sendAttachment(file);
        });
      }, 400);
    },
    [sendAttachment],
  );

  const openAttachment = useCallback((attachment: ChatAttachment) => {
    if (attachment.fileType?.startsWith('image/')) {
      setViewerImage(attachment);
      return;
    }
    void WebBrowser.openBrowserAsync(attachment.url).catch(() => {
      setAttachError('Could not open this file.');
    });
  }, []);

  const closeMessageMenu = useCallback(() => {
    setActionMessage(null);
    setConfirmDeleteMessage(false);
  }, []);

  // The other person deleted the conversation while it was open.
  useEffect(() => {
    if (wasDeleted) {
      navigation.goBack();
    }
  }, [navigation, wasDeleted]);

  const messageMenuOptions: ChatActionSheetOption[] = (() => {
    if (!actionMessage) return [];
    const isOwn = actionMessage.sender === chatUserId;
    const options: ChatActionSheetOption[] = [];
    if (actionMessage.text?.trim()) {
      options.push({
        key: 'copy',
        label: 'Copy text',
        icon: 'copy-outline',
        onPress: () => {
          void Clipboard.setStringAsync(actionMessage.text ?? '');
          closeMessageMenu();
        },
      });
    }
    if (isOwn && actionMessage.text?.trim() && !messagingBlocked) {
      options.push({
        key: 'edit',
        label: 'Edit message',
        icon: 'create-outline',
        onPress: () => {
          setEditing({ messageId: actionMessage._id, text: actionMessage.text ?? '' });
          closeMessageMenu();
        },
      });
    }
    if (isOwn) {
      options.push({
        key: 'delete',
        label: 'Delete message',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => setConfirmDeleteMessage(true),
      });
    } else {
      options.push({
        key: 'report',
        label: 'Report message',
        icon: 'flag-outline',
        onPress: () => {
          const messageId = actionMessage._id;
          closeMessageMenu();
          // Let this sheet finish closing before the report sheet opens (iOS can drop a modal
          // presented while another is dismissing).
          setTimeout(() => openReportReasonPicker(messageId), 350);
        },
      });
    }
    return options;
  })();

  const myReaction = actionMessage?.reactions?.find(
    (reaction) => String(reaction.user) === chatUserId,
  )?.type;

  const reactionsRow =
    actionMessage && !confirmDeleteMessage && !messagingBlocked ? (
      <View style={styles.reactionPicker}>
        {REACTIONS.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`React ${type}`}
            onPress={() => {
              const target = actionMessage;
              closeMessageMenu();
              void toggleReaction(target._id, type);
            }}
            style={({ pressed }) => [
              styles.reactionOption,
              myReaction === type && styles.reactionOptionSelected,
              pressed && styles.reactionOptionPressed,
            ]}
          >
            <AppText style={styles.reactionEmoji}>{type}</AppText>
          </Pressable>
        ))}
      </View>
    ) : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: () =>
        otherUserId ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report user"
              onPress={() => openReportReasonPicker()}
              disabled={isSafetyBusy}
              hitSlop={8}
              style={styles.headerAction}
            >
              <Ionicons name="flag-outline" size={21} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Block user"
              onPress={confirmBlockUser}
              disabled={isSafetyBusy}
              hitSlop={8}
              style={styles.headerAction}
            >
              <Ionicons name="ban-outline" size={21} color={colors.error} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More chat safety options"
              onPress={openSafetyMenu}
              disabled={isSafetyBusy}
              hitSlop={8}
              style={styles.headerAction}
            >
              <Ionicons name="ellipsis-horizontal" size={21} color={colors.textPrimary} />
            </Pressable>
          </View>
        ) : null,
    });
  }, [
    confirmBlockUser,
    isSafetyBusy,
    navigation,
    openReportReasonPicker,
    openSafetyMenu,
    otherUserId,
    title,
  ]);

  /*
   * The list is INVERTED (standard for chats): it is anchored at the newest message, so new
   * messages, the "is typing" bubble and the keyboard opening never need a manual scroll.
   * The old version called scrollToEnd from three places that fought each other (the jumping),
   * and stopped following after any drag, so "is typing" ended up off screen.
   */
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);

  // "Jump to latest" button when reading older messages.
  const [isAwayFromLatest, setIsAwayFromLatest] = useState(false);
  const [hasUnseenNewer, setHasUnseenNewer] = useState(false);
  const newestMessageId = messages[messages.length - 1]?._id;
  const lastSeenNewestRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!newestMessageId) return;
    if (isAwayFromLatest && lastSeenNewestRef.current && newestMessageId !== lastSeenNewestRef.current) {
      setHasUnseenNewer(true);
    }
    if (!isAwayFromLatest) {
      lastSeenNewestRef.current = newestMessageId;
    }
  }, [isAwayFromLatest, newestMessageId]);

  const jumpToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setHasUnseenNewer(false);
  }, []);

  // Sending while scrolled up into history brings you down to your new message.
  useEffect(() => {
    const newest = messages[messages.length - 1];
    if (newest && newest.sender === chatUserId && newest.optimistic && isAwayFromLatest) {
      jumpToLatest();
    }
    // Only when the newest message changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestMessageId]);

  const handleComposerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setComposerHeight(nextHeight);
    }
  }, []);

  if (!isAuthorized || !chatUserId) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        ref={listRef}
        data={newestFirst}
        inverted
        // Keeps what you're reading still when older pages load or new messages arrive while
        // scrolled up; within 80 px of the newest message it follows new content.
        maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 80 }}
        onScroll={(event) => {
          // Inverted: offset 0 is the newest message (visual bottom).
          const away = event.nativeEvent.contentOffset.y > 160;
          setIsAwayFromLatest((current) => (current === away ? current : away));
          if (!away) setHasUnseenNewer(false);
        }}
        scrollEventThrottle={100}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ChatMessageBubble
            message={item}
            isOwn={item.sender === chatUserId}
            currentUserId={chatUserId}
            onRetry={messagingBlocked ? undefined : (message) => void retryMessage(message._id)}
            onOpenAttachment={openAttachment}
            onLongPress={(message) => {
              setConfirmDeleteMessage(false);
              setActionMessage(message);
            }}
            onReactionPress={
              messagingBlocked ? undefined : (message, type) => void toggleReaction(message._id, type)
            }
          />
        )}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 ? styles.messagesEmpty : null,
          // Inverted list: paddingTop sits at the visual bottom, above the composer/keyboard.
          { paddingTop: spacing.md + listBottomInset, paddingBottom: spacing.md },
        ]}
        ListHeaderComponent={
          otherIsTyping ? (
            <View style={styles.typingRow} accessibilityLiveRegion="polite">
              <View style={styles.typingBubble}>
                <AppText variant="caption" style={styles.typingText}>
                  {typingName ? `${typingName} is typing…` : 'Typing…'}
                </AppText>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasOlder ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadOlderMessages()}
              disabled={isLoadingOlder}
              style={({ pressed }) => [styles.loadOlder, pressed && styles.loadOlderPressed]}
            >
              <AppText variant="caption" color="textLink" style={styles.loadOlderLabel}>
                {isLoadingOlder ? 'Loading…' : 'Load earlier messages'}
              </AppText>
            </Pressable>
          ) : null
        }
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          hasLoadedOnce ? (
            <View style={styles.emptyState}>
              <AppText variant="body" style={styles.emptyText}>
                Say hello to start the conversation.
              </AppText>
            </View>
          ) : null
        }
      />

      {isAwayFromLatest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasUnseenNewer ? 'New messages. Jump to latest' : 'Jump to latest message'}
          onPress={jumpToLatest}
          style={({ pressed }) => [
            styles.jumpToLatest,
            { bottom: listBottomInset + spacing.sm },
            pressed && styles.loadOlderPressed,
          ]}
        >
          {hasUnseenNewer ? <View style={styles.jumpDot} /> : null}
          <Ionicons name="arrow-down" size={20} color={colors.textPrimary} />
        </Pressable>
      ) : null}

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View
          onLayout={handleComposerLayout}
          style={[
            styles.composerWrap,
            keyboardHeight <= 0 ? { paddingBottom: insets.bottom } : null,
          ]}
        >
          {messagingBlocked ? (
            <View style={styles.blockedBanner}>
              <AppText variant="caption" style={styles.blockedText}>
                {blockedByMe
                  ? 'You blocked this user, so neither of you can send new messages. The conversation is kept, and you can still report messages.'
                  : 'You can’t reply to this conversation. The messages are kept, and you can still report them or email contact@afoma.io for help.'}
              </AppText>
              {blockedByMe ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={openSafetyMenu}
                  hitSlop={8}
                  style={styles.blockedAction}
                >
                  <AppText variant="caption" style={styles.blockedActionText}>
                    Unblock
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {error || attachError ? (
            <View style={styles.errorBanner}>
              <AppText variant="caption" style={styles.errorText}>
                {attachError ?? error}
              </AppText>
            </View>
          ) : null}

          <ChatComposer
            onSend={sendAndStopTyping}
            onTextChange={handleComposerTextChange}
            isSending={isSending}
            disabled={messagingBlocked}
            editing={editing}
            onSaveEdit={async (messageId, text) => {
              const saved = await editMessage(messageId, text);
              if (saved) setEditing(null);
              return saved;
            }}
            onCancelEdit={() => setEditing(null)}
            onAttachPress={() => setAttachSheetOpen(true)}
          />
        </View>
      </KeyboardStickyView>

      <ChatActionSheet
        visible={actionMessage !== null}
        onClose={closeMessageMenu}
        header={reactionsRow}
        options={messageMenuOptions}
        confirm={
          confirmDeleteMessage && actionMessage
            ? {
                icon: 'trash-outline',
                title: 'Delete this message?',
                message: 'It will show as “This message was deleted” for both of you.',
                confirmLabel: 'Yes, delete',
                onConfirm: () => {
                  const target = actionMessage;
                  closeMessageMenu();
                  void deleteMessage(target._id);
                },
              }
            : null
        }
      />

      <ChatActionSheet {...safetySheetProps} />

      <ChatActionSheet
        visible={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        title="Send an attachment"
        message="Photos, videos, PDF or Office files, up to 25 MB."
        options={[
          {
            key: 'library',
            label: 'Photo or video',
            icon: 'images-outline',
            onPress: () => chooseAttachment('library'),
          },
          {
            key: 'camera',
            label: 'Take a photo',
            icon: 'camera-outline',
            onPress: () => chooseAttachment('camera'),
          },
          {
            key: 'document',
            label: 'Document',
            icon: 'document-attach-outline',
            onPress: () => chooseAttachment('document'),
          },
        ]}
      />

      <Modal
        visible={viewerImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
        statusBarTranslucent
      >
        <View style={styles.viewer}>
          {viewerImage ? (
            <Image
              source={{ uri: viewerImage.url }}
              style={styles.viewerImage}
              resizeMode="contain"
              accessibilityLabel={viewerImage.fileName}
            />
          ) : null}
          <View style={[styles.viewerBar, { top: insets.top + spacing.sm }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open in browser"
              onPress={() => {
                const url = viewerImage?.url;
                setViewerImage(null);
                if (url) void WebBrowser.openBrowserAsync(url);
              }}
              hitSlop={10}
              style={styles.viewerButton}
            >
              <Ionicons name="open-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close photo"
              onPress={() => setViewerImage(null)}
              hitSlop={10}
              style={styles.viewerButton}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesContent: {
    paddingTop: spacing.md,
    flexGrow: 1,
  },
  messagesEmpty: {
    justifyContent: 'center',
  },
  typingRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    alignItems: 'flex-start',
  },
  typingBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  typingText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  composerWrap: {
    backgroundColor: colors.background,
  },
  errorBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  errorText: {
    color: colors.error,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerAction: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerBar: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  viewerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadOlder: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  loadOlderPressed: {
    opacity: 0.7,
  },
  loadOlderLabel: {
    fontWeight: '600',
  },
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  reactionOption: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  reactionOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  reactionOptionPressed: {
    opacity: 0.7,
  },
  reactionEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  jumpToLatest: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  jumpDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  blockedBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  blockedText: {
    color: colors.textSecondary,
  },
  blockedAction: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  blockedActionText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
