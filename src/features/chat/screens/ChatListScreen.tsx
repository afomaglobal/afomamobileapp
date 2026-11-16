import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import type { ShoppingStackParamList } from '../../../app/navigation/types';
import {
  marketplaceScrollProps,
  useMarketplaceScrollHandler,
} from '../../../app/navigation/marketplaceChrome';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRequireAuth } from '../../auth/hooks/useRequireAuth';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { resolveChatUserId } from '../utils/resolveChatUserId';
import { ChatListItem } from '../components/ChatListItem';
import { useChatInbox } from '../hooks/useChatInbox';
import { deleteChat } from '../api/chatApi';
import { ChatActionSheet } from '../components/ChatActionSheet';
import { emitChatUnreadEvent } from '../utils/chatUnreadEvents';
import { getChatTitle } from '../utils/chatDisplay';
import { getErrorMessage } from '../../../services/api/errors';
import type { ChatSummary } from '../types/chat';

type Props = NativeStackScreenProps<ShoppingStackParamList, 'ChatList'>;

const CHAT_LIST_RETURN_TO = authReturnTo.messages();

export function ChatListScreen({ navigation }: Props) {
  const onMarketplaceScroll = useMarketplaceScrollHandler();
  const { user, role } = useAuth();
  const chatUserId = resolveChatUserId(user);
  const { isAuthorized } = useRequireAuth(CHAT_LIST_RETURN_TO);
  const { chats, hasLoadedOnce, isRefreshing, error, refresh } = useChatInbox(
    isAuthorized ? chatUserId : undefined,
  );
  const [menuChat, setMenuChat] = useState<ChatSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hasFocusedOnce = useRef(false);

  // Coming back from a conversation: refresh so read state and order are current.
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }
      void refresh();
    }, [refresh]),
  );

  const closeMenu = () => {
    if (isDeleting) return;
    setMenuChat(null);
    setConfirmDelete(false);
    setDeleteError(null);
  };

  const handleDeleteChat = async () => {
    if (!menuChat) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteChat(menuChat._id);
      emitChatUnreadEvent({ type: 'deleted', chatId: menuChat._id });
      setMenuChat(null);
      setConfirmDelete(false);
    } catch (caught) {
      setDeleteError(getErrorMessage(caught, 'Could not delete conversation'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthorized || !chatUserId) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        onScroll={onMarketplaceScroll}
        {...marketplaceScrollProps}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            myId={chatUserId}
            myRole={role ?? user?.userRole}
            onPress={() =>
              navigation.navigate('ChatThread', {
                chatId: item._id,
              })
            }
            onLongPress={() => setMenuChat(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          hasLoadedOnce ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.textInverse} />
              </View>
              <AppText variant="h3" style={styles.emptyTitle}>
                No messages yet
              </AppText>
              <AppText variant="body" style={styles.emptyBody}>
                Message a seller from any product page to start a conversation.
              </AppText>
            </View>
          ) : null
        }
      />

      <ChatActionSheet
        visible={menuChat !== null}
        onClose={closeMenu}
        busy={isDeleting}
        title={menuChat ? getChatTitle(menuChat, chatUserId, role ?? user?.userRole) : undefined}
        message={deleteError ?? undefined}
        confirm={
          confirmDelete && menuChat && !deleteError
            ? {
                icon: 'trash-outline',
                title: 'Delete this conversation?',
                message: `All messages will be removed for you and ${getChatTitle(menuChat, chatUserId, role ?? user?.userRole)}. This can’t be undone.`,
                confirmLabel: 'Yes, delete for both',
                cancelLabel: 'Keep conversation',
                onConfirm: () => void handleDeleteChat(),
              }
            : null
        }
        options={
          confirmDelete
            ? []
            : [
                {
                  key: 'open',
                  label: 'Open conversation',
                  icon: 'chatbubble-outline',
                  onPress: () => {
                    const target = menuChat;
                    closeMenu();
                    if (target) navigation.navigate('ChatThread', { chatId: target._id });
                  },
                },
                {
                  key: 'delete',
                  label: 'Delete conversation',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => setConfirmDelete(true),
                },
              ]
        }
      />

      {error ? (
        <View style={styles.errorBanner}>
          <AppText variant="caption" style={styles.errorText}>
            {error}
          </AppText>
          <AppButton label="Retry" variant="outline" onPress={() => void refresh()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
  },
});
