import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

// There's deliberately no self-service UI to grant `isPlatformAdmin` — that
// would be a privilege-escalation hole (any user could make themselves an
// admin). It's set directly in the database by whoever operates the
// deployment, the same way you'd grant any break-glass admin capability.
export async function requireAdmin() {
  const user = await getUser();
  if (!user || !user.isPlatformAdmin) {
    redirect('/dashboard');
  }
  return user;
}
