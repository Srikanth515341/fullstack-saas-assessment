'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { notifications } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

export async function markNotificationRead(notificationId: number) {
  const user = await getUser();
  if (!user) {
    return;
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
}

export async function markAllNotificationsRead() {
  const user = await getUser();
  if (!user) {
    return;
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
}
