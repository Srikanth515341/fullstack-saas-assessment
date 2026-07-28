import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, ActivityType } from '@/lib/db/schema';
import { consumeVerificationToken } from '@/lib/auth/tokens';
import { getUserWithTeam } from '@/lib/db/queries';
import { logActivity } from '@/app/(login)/actions';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/dashboard?verified=missing', request.url));
  }

  const userId = await consumeVerificationToken(token, 'email_verification');
  if (!userId) {
    return NextResponse.redirect(new URL('/dashboard?verified=invalid', request.url));
  }

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, userId));

  const userWithTeam = await getUserWithTeam(userId);
  await logActivity(userWithTeam?.teamId, userId, ActivityType.VERIFY_EMAIL);

  return NextResponse.redirect(new URL('/dashboard?verified=success', request.url));
}
