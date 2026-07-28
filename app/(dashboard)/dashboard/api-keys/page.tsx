import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Ban } from 'lucide-react';
import { getApiKeysForUser } from '@/lib/db/queries';
import { getDictionary, parseLocale } from '@/lib/i18n/dictionaries';
import { CreateApiKeyForm } from './create-api-key-form';
import { revokeApiKey } from './actions';

function formatDate(date: Date | null) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default async function ApiKeysPage() {
  const keys = await getApiKeysForUser();
  const locale = parseLocale((await cookies()).get('locale')?.value);
  const t = getDictionary(locale);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        {t.apiKeys.title}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.apiKeys.publicApiAccess}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Use an API key to access your tasks programmatically:{' '}
            <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">
              GET /api/v1/tasks
            </code>{' '}
            with header{' '}
            <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5">
              Authorization: Bearer &lt;key&gt;
            </code>
            .
          </p>
          <CreateApiKeyForm />

          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <KeyRound className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t.apiKeys.noKeys}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">{t.apiKeys.noKeysHint}</p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {key.name}{' '}
                      {key.revokedAt && (
                        <span className="text-xs text-red-500 font-normal">(revoked)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      <code>{key.keyPrefix}...</code> · Last used: {formatDate(key.lastUsedAt)}
                    </p>
                  </div>
                  {!key.revokedAt && (
                    <form action={revokeApiKey}>
                      <input type="hidden" name="keyId" value={key.id} />
                      <button
                        type="submit"
                        className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-xs shrink-0"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {t.apiKeys.revoke}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
