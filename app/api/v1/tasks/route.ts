import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { tasks, type NewTask } from '@/lib/db/schema';
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

export async function GET(request: NextRequest) {
  const user = await authenticateApiRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id);
  if (limited) return limited;

  const userTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt)));

  return NextResponse.json({ tasks: userTasks });
}

const createTaskApiSchema = z.object({
  title: z.string().min(1).max(500),
  dueDate: z.string().optional()
});

export async function POST(request: NextRequest) {
  const user = await authenticateApiRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const limited = rateLimitResponse(user.id);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const result = createTaskApiSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const newTask: NewTask = {
    userId: user.id,
    title: result.data.title,
    dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null
  };
  const [created] = await db.insert(tasks).values(newTask).returning();

  publishTaskEvent(user.id, { type: 'created' });
  return NextResponse.json({ task: created }, { status: 201 });
}
