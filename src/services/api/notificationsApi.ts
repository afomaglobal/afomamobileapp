import type { BellNotification } from '../../features/notifications/types';
import { apiDelete, apiGet, apiPut } from './request';

function sortNotificationsNewestFirst(notifications: BellNotification[]): BellNotification[] {
  return [...notifications].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

/** GET /notifications?userId= */
export async function getNotificationsByUserId(userId: string): Promise<BellNotification[]> {
  const notifications = await apiGet<BellNotification[]>(
    '/notifications',
    { params: { userId } },
    'Failed to load notifications',
  );

  return sortNotificationsNewestFirst(notifications);
}

/** PUT /notifications/:id — mark as read */
export async function markNotificationRead(notificationId: string): Promise<{ success?: boolean }> {
  return apiPut<{ success?: boolean }>(
    `/notifications/${notificationId}`,
    {},
    undefined,
    'Failed to update notification',
  );
}

/** DELETE /notifications/:id */
export async function deleteNotificationById(notificationId: string): Promise<{ success?: boolean }> {
  return apiDelete<{ success?: boolean }>(
    `/notifications/${notificationId}`,
    undefined,
    'Failed to delete notification',
  );
}
