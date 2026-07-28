import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getOAuthAuthorizeUrl, type OAuthProvider } from '@/lib/auth/oauth';

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

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${process.env.BASE_URL}/api/auth/${provider}/callback`;
  const authorizeUrl = getOAuthAuthorizeUrl(provider, redirectUri, state);

  if (!authorizeUrl) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${provider}_not_configured`, request.url)
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  // Short-lived, httpOnly — only used to verify the callback isn't a CSRF/replay.
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600
  });
  return response;
}
