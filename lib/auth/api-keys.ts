import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { apiKeys, users, type NewApiKey } from '@/lib/db/schema';

const KEY_PREFIX = 'sk_live_';

function hashKey(rawKey: string) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

// Returns the raw key exactly once — only the hash is persisted, same
// pattern as verification tokens. If it's lost, the only fix is revoking
// and creating a new one; there's no "show me my key again" by design.
export async function createApiKey(userId: number, name: string) {
  const secret = crypto.randomBytes(24).toString('base64url');
  const rawKey = `${KEY_PREFIX}${secret}`;

  const newKey: NewApiKey = {
    userId,
    name,
    keyHash: hashKey(rawKey),
    keyPrefix: rawKey.slice(0, 16)
  };

  const [created] = await db.insert(apiKeys).values(newKey).returning();
  return { apiKey: created, rawKey };
}

export async function authenticateApiKey(rawKey: string) {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hashKey(rawKey)), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!key) {
    return null;
  }

  // Best-effort — a failed write here shouldn't block the actual request.
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {});

  const [user] = await db.select().from(users).where(eq(users.id, key.userId)).limit(1);
  return user ?? null;
}

// Shared by every /api/v1/* route — extracts and validates the Bearer token.
export async function authenticateApiRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const rawKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!rawKey) {
    return null;
  }
  return authenticateApiKey(rawKey);
}
