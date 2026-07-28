'use server';

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { apiKeys, ActivityType } from '@/lib/db/schema';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { createApiKey } from '@/lib/auth/api-keys';
import { logActivity } from '@/app/(login)/actions';

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100)
});

export const createApiKeyAction = validatedActionWithUser(
  createApiKeySchema,
  async (data, _, user) => {
    const { apiKey, rawKey } = await createApiKey(user.id, data.name);

    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.CREATE_API_KEY);

    revalidatePath('/dashboard/api-keys');
    return {
      success: 'API key created. Copy it now — it will not be shown again.',
      rawKey,
      keyId: apiKey.id
    };
  }
);

export async function revokeApiKey(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error('User is not authenticated');
  }

  const keyId = Number(formData.get('keyId'));
  if (!keyId) {
    return;
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)));

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.REVOKE_API_KEY);

  revalidatePath('/dashboard/api-keys');
}
