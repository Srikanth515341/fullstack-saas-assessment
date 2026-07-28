import { NextResponse } from 'next/server';
import { getTasksForUser, getUser } from '@/lib/db/queries';
import { toCsv } from '@/lib/csv';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = await getTasksForUser();
  const csv = toCsv(
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      dueDate: task.dueDate?.toISOString() ?? '',
      createdAt: task.createdAt.toISOString()
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tasks-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
