// In-memory rate limiter. Fine for a single dev/demo instance; it does NOT
// share state across multiple serverless instances, which is exactly the
// gap Upstash closes in production.
//
// To wire up real Upstash rate limiting:
//   1. pnpm add @upstash/ratelimit @upstash/redis
//   2. Add UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN to .env
//   3. Replace this module's body with:
//        import { Ratelimit } from '@upstash/ratelimit';
//        import { Redis } from '@upstash/redis';
//        const ratelimit = new Ratelimit({
//          redis: Redis.fromEnv(),
//          limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`)
//        });
//        const { success, remaining, reset } = await ratelimit.limit(key);

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Prevent unbounded memory growth from one-off keys (e.g. per-IP limiting)
// piling up forever in a long-running process.
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    console.warn(
      'UPSTASH_REDIS_REST_URL is set but lib/rate-limit.ts still uses the in-memory stub — wire up @upstash/ratelimit to actually share limits across instances.'
    );
  }

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    resetAt: existing.resetAt
  };
}
