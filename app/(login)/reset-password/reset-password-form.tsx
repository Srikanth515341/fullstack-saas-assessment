'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '../actions';
import { ActionState } from '@/lib/auth/middleware';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPassword,
    { error: '' }
  );

  if (!token) {
    return (
      <p className="text-center text-sm text-red-500">
        This link is missing a token. Request a new one from{' '}
        <Link href="/forgot-password" className="underline">
          forgot password
        </Link>
        .
      </p>
    );
  }

  return (
    <form className="space-y-6" action={formAction}>
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={100}
          className="mt-1 rounded-full"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm New Password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          maxLength={100}
          className="mt-1 rounded-full"
        />
      </div>

      {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}
      {state?.success && (
        <div className="text-green-600 text-sm">
          {state.success}{' '}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </div>
      )}

      <Button
        type="submit"
        className="w-full flex justify-center items-center py-2 px-4 rounded-full bg-orange-600 hover:bg-orange-700 text-white"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Resetting...
          </>
        ) : (
          'Reset password'
        )}
      </Button>
    </form>
  );
}
