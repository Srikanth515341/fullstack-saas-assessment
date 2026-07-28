import { describe, it, expect } from 'vitest';
import { rateLimit } from './rate-limit';

// Each test uses its own key so tests don't interfere with each other via
// the module-level bucket map.
let counter = 0;
function uniqueKey() {
  return `test-key-${++counter}`;
}

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, { limit: 5, windowMs: 60_000 });
      expect(result.success).toBe(true);
    }
  });

  it('rejects the request that exceeds the limit within the window', () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { limit: 3, windowMs: 60_000 });
    }
    const result = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('decrements remaining on each successful call', () => {
    const key = uniqueKey();
    const first = rateLimit(key, { limit: 3, windowMs: 60_000 });
    const second = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(first.remaining).toBe(2);
    expect(second.remaining).toBe(1);
  });

  it('resets the count once the window has passed', async () => {
    const key = uniqueKey();
    rateLimit(key, { limit: 1, windowMs: 10 });
    const blocked = rateLimit(key, { limit: 1, windowMs: 10 });
    expect(blocked.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const afterReset = rateLimit(key, { limit: 1, windowMs: 10 });
    expect(afterReset.success).toBe(true);
  });

  it('tracks separate keys independently', () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    rateLimit(keyA, { limit: 1, windowMs: 60_000 });
    const resultB = rateLimit(keyB, { limit: 1, windowMs: 60_000 });
    expect(resultB.success).toBe(true);
  });
});
