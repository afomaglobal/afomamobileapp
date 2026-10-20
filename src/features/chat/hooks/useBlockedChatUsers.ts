import { useCallback, useEffect, useState } from 'react';

import { fetchBlockedChatUserIds } from '../api/chatModerationApi';

export function useBlockedChatUsers(enabled: boolean) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setBlockedUserIds([]);
      setHasLoaded(false);
      return;
    }

    try {
      const ids = await fetchBlockedChatUserIds();
      setBlockedUserIds(ids);
    } catch {
      setBlockedUserIds([]);
    } finally {
      setHasLoaded(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isUserBlocked = useCallback(
    (userId: string | undefined) => {
      if (!userId?.trim()) {
        return false;
      }
      return blockedUserIds.includes(userId.trim());
    },
    [blockedUserIds],
  );

  return {
    blockedUserIds,
    hasLoaded,
    isUserBlocked,
    refresh,
  };
}
