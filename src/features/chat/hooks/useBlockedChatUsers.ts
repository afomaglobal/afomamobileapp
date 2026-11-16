import { useCallback, useEffect, useState } from 'react';

import { fetchChatBlockState } from '../api/chatModerationApi';

/**
 * Who I blocked and who blocked me. Blocking only stops new messages; the conversation
 * history stays visible to both people.
 */
export function useBlockedChatUsers(enabled: boolean) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setBlockedUserIds([]);
      setBlockedByUserIds([]);
      setHasLoaded(false);
      return;
    }

    try {
      const state = await fetchChatBlockState();
      setBlockedUserIds(state.blockedUserIds);
      setBlockedByUserIds(state.blockedByUserIds);
    } catch {
      setBlockedUserIds([]);
      setBlockedByUserIds([]);
    } finally {
      setHasLoaded(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** I blocked this user. */
  const isUserBlocked = useCallback(
    (userId: string | undefined) => Boolean(userId?.trim() && blockedUserIds.includes(userId.trim())),
    [blockedUserIds],
  );

  /** This user blocked me. */
  const isBlockedByUser = useCallback(
    (userId: string | undefined) =>
      Boolean(userId?.trim() && blockedByUserIds.includes(userId.trim())),
    [blockedByUserIds],
  );

  return {
    blockedUserIds,
    blockedByUserIds,
    hasLoaded,
    isUserBlocked,
    isBlockedByUser,
    refresh,
  };
}
