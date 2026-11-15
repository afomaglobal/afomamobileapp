import { StyleSheet, View } from 'react-native';

import { MarketplaceHeader } from './MarketplaceHeader';
import { colors } from '../../../design-system';
import { useAuth } from '../../auth/hooks/useAuth';
import { resolveBackendUserDocumentId } from '../../auth/utils/resolveBackendUserDocumentId';
import { useBellNotifications } from '../../notifications/hooks/useBellNotifications';
import { useChatUnreadTotal } from '../../chat/hooks/useChatUnreadTotal';
import { resolveChatUserId } from '../../chat/utils/resolveChatUserId';

export interface MarketplaceTopChromeProps {
  onProfilePress: () => void;
  onSearchPress: () => void;
  onNotificationsPress?: () => void;
  onMessagesPress?: () => void;
}

export function MarketplaceTopChrome({
  onProfilePress,
  onSearchPress,
  onNotificationsPress,
  onMessagesPress,
}: MarketplaceTopChromeProps) {
  const { isAuthenticated, user } = useAuth();
  const userId = resolveBackendUserDocumentId(user);
  const { unreadCount } = useBellNotifications({
    userId: isAuthenticated ? userId : undefined,
    enabled: isAuthenticated,
  });
  const { total: messagesUnreadCount } = useChatUnreadTotal(
    isAuthenticated ? resolveChatUserId(user) : undefined,
  );

  return (
    <View style={styles.container}>
      <MarketplaceHeader
        onProfilePress={onProfilePress}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        notificationUnreadCount={unreadCount}
        onMessagesPress={onMessagesPress}
        messagesUnreadCount={messagesUnreadCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
});
