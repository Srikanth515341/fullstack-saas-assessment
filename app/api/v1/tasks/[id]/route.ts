import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { tasks } from '@/lib/db/schema';
import { authenticateApiRequest } from '@/lib/auth/api-keys';
import { rateLimit } from '@/lib/rate-limit';
import { publishTaskEvent } from '@/lib/realtime/task-events';

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

function rateLimitResponse(userId: number) {
  const result = rateLimit(`api:${userId}`, RATE_LIMIT);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) }
      }
    );
  }
  return null;
}

const updateTaskApiSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateApiRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id);
  if (limited) return limited;

  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isFinite(taskId)) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const result = updateTaskApiSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  // Scoping by userId is what prevents one API key from touching another
  // account's task by guessing an id — same rule as the dashboard actions.
  const [updated] = await db
    .update(tasks)
    .set(result.data)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  publishTaskEvent(user.id, { type: 'updated' });
  return NextResponse.json({ task: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateApiRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id);
  if (limited) return limited;

  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isFinite(taskId)) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  const [deleted] = await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  publishTaskEvent(user.id, { type: 'deleted' });
  return NextResponse.json({ success: true });
}
