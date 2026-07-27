'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { tasks, ActivityType, type NewTask } from '@/lib/db/schema';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { logActivity } from '@/app/(login)/actions';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  dueDate: z.string().optional()
});

export const createTask = validatedActionWithUser(
  createTaskSchema,
  async (data, _, user) => {
    const { title, dueDate } = data;

    const newTask: NewTask = {
      userId: user.id,
      title,
      dueDate: dueDate ? new Date(dueDate) : null
    };

    await db.insert(tasks).values(newTask);

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.CREATE_TASK);

    revalidatePath('/dashboard/tasks');
    return { success: 'Task added.' };
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

  revalidatePath('/dashboard/tasks');
}

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
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_TASK);

  revalidatePath('/dashboard/tasks');
}
