import { Suspense } from 'react';
import { Login } from '../login';
import { isOAuthProviderConfigured } from '@/lib/auth/oauth';

export default function SignUpPage() {
  return (
    <Suspense>
      <Login
        mode="signup"
        googleEnabled={isOAuthProviderConfigured('google')}
        githubEnabled={isOAuthProviderConfigured('github')}
      />
    </Suspense>
  );
}
