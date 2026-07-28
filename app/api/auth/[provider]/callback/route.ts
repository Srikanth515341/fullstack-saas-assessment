import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  users,
  teams,
  teamMembers,
  oauthAccounts,
  ActivityType,
  type NewUser,
  type NewTeam,
  type NewTeamMember
} from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { exchangeOAuthCode, fetchOAuthProfile, type OAuthProvider } from '@/lib/auth/oauth';
import { getUserWithTeam } from '@/lib/db/queries';
import { logActivity } from '@/app/(login)/actions';

function isSupportedProvider(provider: string): provider is OAuthProvider {
  return provider === 'google' || provider === 'github';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isSupportedProvider(provider)) {
    return NextResponse.redirect(new URL('/sign-in?error=unknown_provider', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const storedState = request.cookies.get('oauth_state')?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/sign-in?error=invalid_state', request.url));
  }

  try {
    const redirectUri = `${process.env.BASE_URL}/api/auth/${provider}/callback`;
    const accessToken = await exchangeOAuthCode(provider, code, redirectUri);
    const profile = await fetchOAuthProfile(provider, accessToken);

    // Account linking: if this provider+id was already linked, reuse that user.
    const [existingLink] = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, profile.id)
        )
      )
      .limit(1);

    let userId: number;

    if (existingLink) {
      userId = existingLink.userId;
    } else {
      // Not linked yet — match by email so an existing password account gets
      // linked instead of silently creating a duplicate user for the same person.
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const newUser: NewUser = {
          email: profile.email,
          name: profile.name,
          // Unusable random hash — this account can only sign in via OAuth
          // unless the user later sets a password through "forgot password".
          passwordHash: crypto.randomBytes(32).toString('hex'),
          role: 'owner',
          emailVerifiedAt: new Date() // the provider already verified this email
        };
        const [createdUser] = await db.insert(users).values(newUser).returning();
        userId = createdUser.id;

        const newTeam: NewTeam = { name: `${profile.email}'s Team` };
        const [createdTeam] = await db.insert(teams).values(newTeam).returning();
        const newTeamMember: NewTeamMember = {
          userId,
          teamId: createdTeam.id,
          role: 'owner'
        };
        await db.insert(teamMembers).values(newTeamMember);
      }

      await db.insert(oauthAccounts).values({
        userId,
        provider,
        providerAccountId: profile.id
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    await setSession(user);

    const userWithTeam = await getUserWithTeam(userId);
    await logActivity(userWithTeam?.teamId, userId, ActivityType.OAUTH_LOGIN);

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.delete('oauth_state');
    return response;
  } catch (error) {
    console.error(`OAuth callback failed for ${provider}:`, error);
    return NextResponse.redirect(new URL('/sign-in?error=oauth_failed', request.url));
  }
}
