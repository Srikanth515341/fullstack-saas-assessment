import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getAllUsersForAdmin, getAllTeamsForAdmin } from '@/lib/db/queries';
import { getDictionary, parseLocale } from '@/lib/i18n/dictionaries';

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default async function AdminPage() {
  await requireAdmin();

  const [users, teams] = await Promise.all([
    getAllUsersForAdmin(),
    getAllTeamsForAdmin()
  ]);

  const locale = parseLocale((await cookies()).get('locale')?.value);
  const t = getDictionary(locale);

  return (
    <section className="flex-1 p-4 lg:p-8 space-y-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900">{t.admin.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.allUsers} ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">ID</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Verified</th>
                  <th className="py-2 pr-4 font-medium">Admin</th>
                  <th className="py-2 pr-4 font-medium">Joined</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-gray-500">{u.id}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{u.name || '—'}</td>
                    <td className="py-2 pr-4">{u.emailVerifiedAt ? '✓' : '—'}</td>
                    <td className="py-2 pr-4">{u.isPlatformAdmin ? '✓' : '—'}</td>
                    <td className="py-2 pr-4 text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="py-2">
                      {u.deletedAt ? (
                        <span className="text-red-500">Deleted</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.allTeams} ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">ID</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Subscription</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-gray-500">{team.id}</td>
                    <td className="py-2 pr-4">{team.name}</td>
                    <td className="py-2 pr-4">{team.planName || 'Free'}</td>
                    <td className="py-2 pr-4">{team.subscriptionStatus || '—'}</td>
                    <td className="py-2 text-gray-500">{formatDate(team.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
