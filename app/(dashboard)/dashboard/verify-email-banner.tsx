'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/lib/db/schema';
import { resendVerificationEmail } from '@/app/(login)/actions';
import { useToast } from '@/components/toast-provider';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function VerifyEmailBanner() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerifiedAt) {
    return null;
  }

  async function handleResend() {
    setSending(true);
    await resendVerificationEmail();
    setSending(false);
    showToast('Verification email sent — check the server console (stub email).', 'success');
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <MailWarning className="h-4 w-4 shrink-0" />
        Please verify your email address.
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleResend}
        disabled={sending}
      >
        {sending ? 'Sending...' : 'Resend email'}
      </Button>
    </div>
  );
}
