'use client';

import { useActionState } from 'react';
import useSWR, { mutate } from 'swr';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { uploadAvatar } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import { useActionToast } from '@/components/use-action-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  error?: string;
  success?: string;
};

export function AvatarUploadForm() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const result = await uploadAvatar(formData);
      if (!('error' in result)) {
        mutate('/api/user');
      }
      return result;
    },
    {}
  );
  useActionToast(state);

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <form action={formAction} className="flex items-center gap-4 mb-6">
      <Avatar className="size-16">
        <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || ''} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <input
          type="file"
          name="avatar"
          accept="image/*"
          required
          className="text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-orange-600"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="ml-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
        </Button>
        {state?.error && <p className="text-red-500 text-xs mt-1">{state.error}</p>}
      </div>
    </form>
  );
}
