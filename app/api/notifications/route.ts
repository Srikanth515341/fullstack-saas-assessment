import { getNotificationsForUser, getUnreadNotificationCount } from '@/lib/db/queries';

export async function GET() {
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(),
    getUnreadNotificationCount()
  ]);

  return Response.json({ notifications, unreadCount });
}
