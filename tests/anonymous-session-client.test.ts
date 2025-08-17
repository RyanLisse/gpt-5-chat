import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAnonymousSession,
  createAnonymousSession,
  getAnonymousSession,
  setAnonymousSession,
} from '@/lib/anonymous-session-client';
import { ANONYMOUS_SESSION_COOKIES_KEY } from '@/lib/constants';
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';

describe('anonymous-session client helpers', () => {
  beforeEach(() => {
    // Minimal document stub for cookie handling in Node test env
    if (!(globalThis as any).document) {
      (globalThis as any).document = { cookie: '' };
    }
    // Reset cookies between tests
    (globalThis as any).document.cookie =
      `${ANONYMOUS_SESSION_COOKIES_KEY}=; Path=/; Max-Age=0`;
  });

  it('creates a valid anonymous session object', () => {
    const session = createAnonymousSession();
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
    expect(session.createdAt instanceof Date).toBe(true);
  });

  it('persists and reads session via cookie', () => {
    const session = createAnonymousSession();
    setAnonymousSession(session);

    const readBack = getAnonymousSession();
    expect(readBack).not.toBeNull();
    expect(readBack?.id).toBe(session.id);
    expect(readBack?.createdAt instanceof Date).toBe(true);
  });

  it('returns null once session is expired', () => {
    const session = createAnonymousSession();
    // Write a cookie with an old createdAt to simulate expiration
    const expired = { ...session, createdAt: new Date(0) };
    document.cookie = `${ANONYMOUS_SESSION_COOKIES_KEY}=${encodeURIComponent(
      JSON.stringify(expired),
    )}; Path=/; Max-Age=${ANONYMOUS_LIMITS.SESSION_DURATION}; SameSite=Lax`;

    const readBack = getAnonymousSession();
    expect(readBack).toBeNull();
  });

  it('clearAnonymousSession removes cookie', () => {
    const session = createAnonymousSession();
    setAnonymousSession(session);
    expect(getAnonymousSession()).not.toBeNull();

    clearAnonymousSession();
    expect(getAnonymousSession()).toBeNull();
  });
});
