'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Copy, Check } from 'lucide-react';
import { createApiKeyAction } from './actions';
import { useActionToast } from '@/components/use-action-toast';

type ActionState = {
  error?: string;
  success?: string;
  rawKey?: string;
};

export function CreateApiKeyForm() {
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createApiKeyAction,
    {}
  );
  useActionToast(state.error ? { error: state.error } : undefined);

  async function handleCopy() {
    if (!state.rawKey) return;
    await navigator.clipboard.writeText(state.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex gap-3">
        <Input name="name" placeholder="Key name (e.g. CLI, CI pipeline)" required maxLength={100} className="flex-1" />
        <Button type="submit" disabled={pending} className="bg-orange-500 hover:bg-orange-600 text-white">
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Key
            </>
          )}
        </Button>
      </form>

      {state.rawKey && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
          <p className="text-xs text-orange-800 mb-2">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white rounded px-2 py-1.5 border border-orange-200 overflow-x-auto">
              {state.rawKey}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
