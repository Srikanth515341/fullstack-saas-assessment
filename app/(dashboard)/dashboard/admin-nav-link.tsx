'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Isolated in its own component (and rendered under its own <Suspense> in
// the layout) rather than reading useSWR('/api/user', ...) directly in the
// shared dashboard layout body — that pattern already broke Partial
// Prerendering for every /dashboard/* route once this session (see
// NotificationBell/VerifyEmailBanner in docs/section-c-level2.md).
export function AdminNavLink({
  pathname,
  onNavigate
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const { data: user } = useSWR<User>('/api/user', fetcher);

  if (!user?.isPlatformAdmin) {
    return null;
  }

  const href = '/dashboard/admin';

  return (
    <Link href={href} passHref>
      <Button
        variant={pathname === href ? 'secondary' : 'ghost'}
        className={`shadow-none my-1 w-full justify-start ${
          pathname === href ? 'bg-gray-100' : ''
        }`}
        onClick={onNavigate}
      >
        <ShieldAlert className="h-4 w-4" />
        Admin
      </Button>
    </Link>
  );
}
