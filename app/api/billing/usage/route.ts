import { NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { getUsageSummaryForTeam } from '@/lib/payments/metered-usage';

export async function GET() {
  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.json({ error: 'No team' }, { status: 404 });
  }

  const usage = await getUsageSummaryForTeam(team.id);
  return NextResponse.json(usage);
}
