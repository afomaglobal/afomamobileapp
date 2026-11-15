import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  FlatList,
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
import type { ChatMessage } from '../types/chat';

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

  const { isUserBlocked, refresh: refreshBlockedUsers } = useBlockedChatUsers(Boolean(chatUserId));
  const messagingBlocked = isUserBlocked(otherUserId);

  const realChatId = chat?._id && !isTempChatId(chat._id) ? chat._id : undefined;

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
    onBlocked: () => {
      void refreshBlockedUsers();
      navigation.goBack();
    },
    onDeleteConversation: realChatId ? handleDeleteConversation : undefined,
  });

  // Long-press menu for a single message.
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState(false);
  const [editing, setEditing] = useState<{ messageId: string; text: string } | null>(null);

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
    if (confirmDeleteMessage) {
      return [
        {
          key: 'confirm-delete',
          label: 'Delete for everyone',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => {
            const target = actionMessage;
            closeMessageMenu();
            void deleteMessage(target._id);
          },
        },
      ];
    }

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

  const scrollToLatestMessage = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // Scroll down only when a newer message appears — not when earlier ones are loaded on top.
  const newestMessageId = messages[messages.length - 1]?._id;
  const followLatestRef = useRef(true);
  useEffect(() => {
    if (!hasLoadedOnce || !newestMessageId) {
      return;
    }

    followLatestRef.current = true;
    scrollToLatestMessage(true);
  }, [hasLoadedOnce, newestMessageId, scrollToLatestMessage]);

  useEffect(() => {
    if (keyboardHeight <= 0 || messages.length === 0) {
      return;
    }

    scrollToLatestMessage(true);
  }, [keyboardHeight, messages.length, scrollToLatestMessage]);

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
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ChatMessageBubble
            message={item}
            isOwn={item.sender === chatUserId}
            currentUserId={chatUserId}
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
          { paddingBottom: spacing.md + listBottomInset },
        ]}
        ListHeaderComponent={
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
        onContentSizeChange={() => {
          if (messages.length > 0 && followLatestRef.current) {
            scrollToLatestMessage(false);
          }
        }}
        onScrollBeginDrag={() => {
          // The user is reading history; stop pinning to the bottom until a new message arrives.
          followLatestRef.current = false;
        }}
      />

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
                Messaging with this user is unavailable. You can report or block them from the menu
                above, or email contact@afoma.io for help.
              </AppText>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <AppText variant="caption" style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}

          <ChatComposer
            onSend={sendMessage}
            isSending={isSending}
            disabled={messagingBlocked}
            editing={editing}
            onSaveEdit={async (messageId, text) => {
              const saved = await editMessage(messageId, text);
              if (saved) setEditing(null);
              return saved;
            }}
            onCancelEdit={() => setEditing(null)}
          />
        </View>
      </KeyboardStickyView>

      <ChatActionSheet
        visible={actionMessage !== null}
        onClose={closeMessageMenu}
        title={confirmDeleteMessage ? 'Delete message?' : undefined}
        message={
          confirmDeleteMessage
            ? 'It will show as "This message was deleted" for both of you.'
            : undefined
        }
        header={reactionsRow}
        options={messageMenuOptions}
      />

      <ChatActionSheet {...safetySheetProps} />
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
  blockedBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  blockedText: {
    color: colors.textSecondary,
  },
});
