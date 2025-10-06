import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, validatePasswordComplexity } from '../src/lib/security';

// Note: Upstash-backed limiter is only used when env is configured. These tests cover the in-memory fallback behavior.
describe('security utilities', () => {
  beforeEach(() => {
    // No state reset hook for in-memory buckets is exposed; rely on unique scope/id per test to avoid interference.
  });

  it('validatePasswordComplexity enforces min length and classes', () => {
    expect(validatePasswordComplexity('short')).toBe(false);
    expect(validatePasswordComplexity('alllowercaseonly')).toBe(false);
    expect(validatePasswordComplexity('NoDigits!!!!')).toBe(true);
    expect(validatePasswordComplexity('WeakBut10ch')).toBe(true);
  });

  it('rateLimit in-memory denies after exceeding threshold', async () => {
    const scope = 'test:rl';
    const id = `user-${Date.now()}`;
    // Allow 2 within 1s window
    const r1 = await rateLimit(scope, id, 2, 1);
    const r2 = await rateLimit(scope, id, 2, 1);
    const r3 = await rateLimit(scope, id, 2, 1);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(typeof r3.retryAfter === 'number').toBe(true);
  });
});
