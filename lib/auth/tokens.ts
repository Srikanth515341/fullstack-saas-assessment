import crypto from 'node:crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { verificationTokens } from '@/lib/db/schema';

export type VerificationTokenType = 'password_reset' | 'email_verification';

function hashToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Returns the raw token to embed in a link/email. Only the hash is stored,
// same reasoning as password hashing — a leaked DB row shouldn't be enough
// to use the token.
export async function createVerificationToken(
  userId: number,
  type: VerificationTokenType,
  expiresInMs: number
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');

  await db.insert(verificationTokens).values({
    userId,
    type,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + expiresInMs)
  });

  return rawToken;
}

// Validates and immediately marks the token used (single-use). Returns the
// associated userId, or null if the token is missing, expired, or already used.
export async function consumeVerificationToken(
  rawToken: string,
  type: VerificationTokenType
): Promise<number | null> {
  const tokenHash = hashToken(rawToken);

  const [token] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.type, type),
        isNull(verificationTokens.usedAt),
        gt(verificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!token) {
    return null;
  }

  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(verificationTokens.id, token.id));

  return token.userId;
}
