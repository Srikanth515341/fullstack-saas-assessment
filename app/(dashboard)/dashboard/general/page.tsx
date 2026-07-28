'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { useActionToast } from '@/components/use-action-toast';
import { AvatarUploadForm } from './avatar-upload-form';
import { useLocale } from '@/components/locale-provider';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  displayName?: string;
  bio?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  displayNameValue?: string;
  bioValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  displayNameValue = '',
  bioValue = '',
  emailValue = ''
}: AccountFormProps) {
  const { t } = useLocale();
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          {t.general.name}
        </Label>
        <Input
          id="name"
          name="name"
          placeholder={t.general.name}
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="displayName" className="mb-2">
          {t.general.displayName}
        </Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="How you'd like to be shown"
          defaultValue={state.displayName || displayNameValue}
        />
      </div>
      <div>
        <Label htmlFor="bio" className="mb-2">
          {t.general.bio}
        </Label>
        <Textarea
          id="bio"
          name="bio"
          placeholder="A short bio about yourself"
          maxLength={280}
          defaultValue={state.bio || bioValue}
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          {t.auth.email}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t.auth.email}
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      displayNameValue={user?.displayName ?? ''}
      bioValue={user?.bio ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );
  useActionToast(state);
  const { t } = useLocale();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        {t.general.title}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.general.accountInfo}</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-16 mb-6" />}>
            <AvatarUploadForm />
          </Suspense>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.general.saving}
                </>
              ) : (
                t.general.saveChanges
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
