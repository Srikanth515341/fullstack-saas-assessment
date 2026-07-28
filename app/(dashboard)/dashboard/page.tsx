'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState } from 'react';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle } from 'lucide-react';
import { useActionToast } from '@/components/use-action-toast';
import { hasPermission, Permission, ALL_TEAM_ROLES } from '@/lib/auth/permissions';
import { useLocale } from '@/components/locale-provider';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// The caller's own role within the current team, looked up from the
// already-fetched member list — not `user.role`, which is a separate,
// global (and largely legacy) field unrelated to team membership.
function useMyTeamRole() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const myMembership = teamData?.teamMembers?.find((m) => m.user.id === user?.id);
  return myMembership?.role;
}

function SubscriptionSkeleton() {
  const { t } = useLocale();
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{t.team.subscription}</CardTitle>
      </CardHeader>
    </Card>
  );
}

type UsageSummary = {
  periodStart: string;
  totalEvents: number;
  reportedToStripe: number;
};

function UsageSummaryBlock() {
  const { data } = useSWR<UsageSummary>('/api/billing/usage', fetcher);
  if (!data) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
      <p className="font-medium">Usage this billing period</p>
      <p className="text-muted-foreground">
        {data.totalEvents} task{data.totalEvents === 1 ? '' : 's'} created
        {data.reportedToStripe > 0 && ` · ${data.reportedToStripe} reported to Stripe`}
      </p>
    </div>
  );
}

function ManageSubscription() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { t } = useLocale();

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t.team.subscription}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                {t.team.currentPlan}: {teamData?.planName || 'Free'}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? 'Billed monthly'
                  : teamData?.subscriptionStatus === 'trialing'
                  ? 'Trial period'
                  : 'No active subscription'}
              </p>
            </div>
            <form action={customerPortalAction}>
              <Button type="submit" variant="outline">
                {t.team.manageSubscription}
              </Button>
            </form>
          </div>
          <UsageSummaryBlock />
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembersSkeleton() {
  const { t } = useLocale();
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{t.team.members}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4 mt-1">
          <div className="flex items-center space-x-4">
            <div className="size-8 rounded-full bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-3 w-14 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const myRole = useMyTeamRole();
  const canRemoveMembers = hasPermission(myRole, Permission.REMOVE_MEMBERS);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});
  useActionToast(removeState);
  const { t } = useLocale();

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || 'Unknown User';
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t.team.members}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.team.noMembers}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t.team.members}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage
                    src={member.user.avatarUrl || undefined}
                    alt={getUserDisplayName(member.user)}
                  />
                  <AvatarFallback>
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {getUserDisplayName(member.user)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
              {canRemoveMembers ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isRemovePending}
                  >
                    {isRemovePending ? 'Removing...' : t.team.remove}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {removeState?.error && (
          <p className="text-red-500 mt-4">{removeState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InviteTeamMemberSkeleton() {
  const { t } = useLocale();
  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>{t.team.invite}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const myRole = useMyTeamRole();
  const canInvite = hasPermission(myRole, Permission.INVITE_MEMBERS);
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});
  useActionToast(inviteState);
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.team.invite}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2">
              {t.team.inviteEmail}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              required
              disabled={!canInvite}
            />
          </div>
          <div>
            <Label>{t.team.inviteRole}</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex flex-wrap gap-4"
              disabled={!canInvite}
            >
              {ALL_TEAM_ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value={role} id={role} />
                  <Label htmlFor={role} className="capitalize">
                    {role}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          {inviteState?.error && (
            <p className="text-red-500">{inviteState.error}</p>
          )}
          {inviteState?.success && (
            <p className="text-green-500">{inviteState.success}</p>
          )}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isInvitePending || !canInvite}
          >
            {isInvitePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.team.inviting}
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.team.inviteButton}
              </>
            )}
          </Button>
        </form>
      </CardContent>
      {!canInvite && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            You do not have permission to invite new members.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useLocale();
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">{t.team.title}</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
      <Suspense fallback={<TeamMembersSkeleton />}>
        <TeamMembers />
      </Suspense>
      <Suspense fallback={<InviteTeamMemberSkeleton />}>
        <InviteTeamMember />
      </Suspense>
    </section>
  );
}
