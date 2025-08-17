import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAnonymousRateLimit } from '@/lib/utils/rate-limit';

function createMockRedis() {
  const store = new Map<string, { value: number; expireAt?: number }>();
  return {
    get: vi.fn(async (key: string) => {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }
      if (entry.expireAt && Date.now() > entry.expireAt) {
        store.delete(key);
        return null;
      }
      return String(entry.value);
    }),
    incr: vi.fn(async (key: string) => {
      const entry = store.get(key);
      if (!entry) {
        store.set(key, { value: 1 });
        return 1;
      }
      entry.value += 1;
      return entry.value;
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      const entry = store.get(key);
      if (!entry) {
        return 0;
      }
      entry.expireAt = Date.now() + seconds * 1000;
      return 1;
    }),
  };
}

describe('checkAnonymousRateLimit', () => {
  const ip = '1.2.3.4';
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it('allows first request and sets headers', async () => {
    const result = await checkAnonymousRateLimit(ip, redis as any);
    expect(result.success).toBe(true);
    expect(result.headers).toBeDefined();
  });

  it('limits when exceeding per-minute threshold', async () => {
    // Infer a low limit situation by calling many times quickly
    // Using the default limits from ANONYMOUS_LIMITS in dev (60/min) we call 61 times
    let last: any = null;
    for (let i = 0; i < 61; i++) {
      // eslint-disable-next-line no-await-in-loop
      last = await checkAnonymousRateLimit(ip, redis as any);
    }
    expect(last.success).toBe(false);
    expect(String(last.headers?.['X-RateLimit-Remaining'])).toBe('0');
  });
});
