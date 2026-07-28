import { NextResponse } from 'next/server';
import { getAllActivityLogsForUser, getUser } from '@/lib/db/queries';
import { toCsv } from '@/lib/csv';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await getAllActivityLogsForUser();
  const csv = toCsv(
    logs.map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.timestamp.toISOString(),
      ipAddress: log.ipAddress ?? ''
    }))
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
