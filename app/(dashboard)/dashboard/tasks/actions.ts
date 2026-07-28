'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import {
  tasks,
  taskCategories,
  ActivityType,
  type NewTask,
  type NewTaskCategory
} from '@/lib/db/schema';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { logActivity } from '@/app/(login)/actions';
import { publishTaskEvent } from '@/lib/realtime/task-events';
import { recordUsage } from '@/lib/payments/metered-usage';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional(),
  categoryId: z.coerce.number().optional()
});

export const createTask = validatedActionWithUser(
  createTaskSchema,
  async (data, _, user) => {
    const { title, description, priority, dueDate, categoryId } = data;

    const newTask: NewTask = {
      userId: user.id,
      title,
      description: description || null,
      priority: priority || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      categoryId: categoryId || null
    };

    await db.insert(tasks).values(newTask);

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.CREATE_TASK);

    // Metered billing (#22) — task creation is this app's one metered
    // dimension. Local usage tracking always succeeds regardless of
    // whether Stripe reporting does; see lib/payments/metered-usage.ts.
    if (userWithTeam?.teamId) {
      await recordUsage(userWithTeam.teamId);
    }

    publishTaskEvent(user.id, { type: 'created' });
    revalidatePath('/dashboard/tasks');
    return { success: 'Task added.' };
  }
);

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50)
});

export const createCategory = validatedActionWithUser(
  createCategorySchema,
  async (data, _, user) => {
    const { name } = data;

    const newCategory: NewTaskCategory = {
      userId: user.id,
      name
    };

    await db.insert(taskCategories).values(newCategory);

    revalidatePath('/dashboard/tasks');
    return { success: 'Category added.' };
  }
);

const taskIdSchema = z.object({
  taskId: z.coerce.number()
});

export async function toggleTask(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error('User is not authenticated');
  }

  const result = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return;
  }
  const { taskId } = result.data;

  // Scoping the WHERE to this user's id is what actually prevents one
  // account from toggling another account's task by guessing an id.
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .limit(1);

  if (!task) {
    return;
  }

  await db
    .update(tasks)
    .set({ completed: !task.completed })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.COMPLETE_TASK);

  publishTaskEvent(user.id, { type: 'updated' });
  revalidatePath('/dashboard/tasks');
}

// Soft delete — moves the task to the trash instead of removing it, so it
// can be restored. `getTasksForUser()` already filters out anything with
// deletedAt set.
export async function deleteTask(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error('User is not authenticated');
  }

  const result = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return;
  }
  const { taskId } = result.data;

  await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_TASK);

  publishTaskEvent(user.id, { type: 'deleted' });
  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard/tasks/trash');
}

export async function restoreTask(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error('User is not authenticated');
  }

  const result = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return;
  }
  const { taskId } = result.data;

  await db
    .update(tasks)
    .set({ deletedAt: null })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.RESTORE_TASK);

  publishTaskEvent(user.id, { type: 'restored' });
  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard/tasks/trash');
}

// Hard delete from the trash — this one is actually unrecoverable.
export async function permanentlyDeleteTask(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error('User is not authenticated');
  }

  const result = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return;
  }
  const { taskId } = result.data;

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  revalidatePath('/dashboard/tasks/trash');
}
