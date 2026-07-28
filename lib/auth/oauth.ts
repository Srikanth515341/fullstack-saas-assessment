export type OAuthProvider = 'google' | 'github';

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
};

function getProviderConfig(provider: OAuthProvider): ProviderConfig {
  if (provider === 'google') {
    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    };
  }
  return {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  };
}

export function isOAuthProviderConfigured(provider: OAuthProvider) {
  const config = getProviderConfig(provider);
  return Boolean(config.clientId && config.clientSecret);
}

// Returns null if the provider has no client ID configured yet — callers
// should treat that as "hide/disable this login option", not an error.
export function getOAuthAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
): string | null {
  const config = getProviderConfig(provider);
  if (!config.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<string> {
  const config = getProviderConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`${provider} OAuth is not configured`);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange ${provider} OAuth code: ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(`${provider} token response did not include an access_token`);
  }

  return data.access_token as string;
}

export type OAuthProfile = {
  id: string;
  email: string;
  name?: string;
};

export async function fetchOAuthProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthProfile> {
  if (provider === 'google') {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return { id: data.sub, email: data.email, name: data.name };
  }

  // GitHub
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'fullstack-saas-assessment'
  };
  const res = await fetch('https://api.github.com/user', { headers });
  const data = await res.json();

  // GitHub only includes `email` on /user if the user made it public.
  // Fall back to the emails endpoint and pick the primary address.
  let email: string | undefined = data.email ?? undefined;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
    const emails: Array<{ email: string; primary: boolean }> = await emailsRes.json();
    email = emails.find((e) => e.primary)?.email ?? emails[0]?.email;
  }

  if (!email) {
    throw new Error('GitHub did not return an email address for this account');
  }

  return { id: String(data.id), email, name: data.name ?? data.login };
}
