import { desc, asc, and, eq, isNull, isNotNull, ilike, count } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  teamMembers,
  teams,
  users,
  tasks,
  taskCategories,
  notifications,
  apiKeys
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId,
      teamRole: teamMembers.role
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

const ACTIVITY_LOG_PAGE_SIZE = 10;

export async function getActivityLogs(page: number = 1) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * ACTIVITY_LOG_PAGE_SIZE;

  const [logs, [{ total }]] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        timestamp: activityLogs.timestamp,
        ipAddress: activityLogs.ipAddress,
        userName: users.name
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.userId, user.id))
      .orderBy(desc(activityLogs.timestamp))
      .limit(ACTIVITY_LOG_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(activityLogs)
      .where(eq(activityLogs.userId, user.id))
  ]);

  return {
    logs,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / ACTIVITY_LOG_PAGE_SIZE))
  };
}

export async function getAllActivityLogsForUser() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress
    })
    .from(activityLogs)
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp));
}

export type TaskFilter = 'all' | 'active' | 'completed';

export async function getTasksForUser(options?: {
  search?: string;
  filter?: TaskFilter;
  categoryId?: number;
}) {
  const user = await getUser();
  if (!user) {
    return [];
  }

  const conditions = [eq(tasks.userId, user.id), isNull(tasks.deletedAt)];

  if (options?.search) {
    conditions.push(ilike(tasks.title, `%${options.search}%`));
  }
  if (options?.filter === 'active') {
    conditions.push(eq(tasks.completed, false));
  } else if (options?.filter === 'completed') {
    conditions.push(eq(tasks.completed, true));
  }
  if (options?.categoryId) {
    conditions.push(eq(tasks.categoryId, options.categoryId));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt));
}

export async function getDeletedTasksForUser() {
  const user = await getUser();
  if (!user) {
    return [];
  }

  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), isNotNull(tasks.deletedAt)))
    .orderBy(desc(tasks.deletedAt));
}

export async function getTaskCategoriesForUser() {
  const user = await getUser();
  if (!user) {
    return [];
  }

  return db
    .select()
    .from(taskCategories)
    .where(eq(taskCategories.userId, user.id))
    .orderBy(asc(taskCategories.name));
}

export async function createNotification(userId: number, message: string) {
  await db.insert(notifications).values({ userId, message });
}

export async function getNotificationsForUser() {
  const user = await getUser();
  if (!user) {
    return [];
  }

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function getUnreadNotificationCount() {
  const user = await getUser();
  if (!user) {
    return 0;
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

  return total;
}

// Admin-only — deliberately not user-scoped. Guarded at the page level via
// requireAdmin(), not here, so the query itself stays a simple "give me
// everything" read.
export async function getAllUsersForAdmin() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isPlatformAdmin: users.isPlatformAdmin,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function getAllTeamsForAdmin() {
  return db.select().from(teams).orderBy(desc(teams.createdAt));
}

export async function getApiKeysForUser() {
  const user = await getUser();
  if (!user) {
    return [];
  }

  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}
