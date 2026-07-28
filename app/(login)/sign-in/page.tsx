import { Suspense } from 'react';
import { Login } from '../login';
import { isOAuthProviderConfigured } from '@/lib/auth/oauth';

export default function SignInPage() {
  return (
    <Suspense>
      <Login
        mode="signin"
        googleEnabled={isOAuthProviderConfigured('google')}
        githubEnabled={isOAuthProviderConfigured('github')}
      />
    </Suspense>
  );
}
