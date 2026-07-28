'use client';

import { useActionState } from 'react';
import { CircleIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '../actions';
import { ActionState } from '@/lib/auth/middleware';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    { error: '' }
  );

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-6" action={formAction}>
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-full"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}
          {state?.success && (
            <div className="text-green-600 text-sm">{state.success}</div>
          )}

          <Button
            type="submit"
            className="w-full flex justify-center items-center py-2 px-4 rounded-full bg-orange-600 hover:bg-orange-700 text-white"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
