import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('@/lib/security', () => {
  let allow = true;
  return {
    rateLimit: vi.fn(async () => ({ allowed: allow, retryAfter: allow ? 0 : 60 })),
    validatePasswordComplexity: vi.fn((pw: string) => typeof pw === 'string' && pw.length >= 10),
    isPasswordBreached: vi.fn(async () => false),
    __setAllow: (v: boolean) => { allow = v; },
  } as any;
});

vi.mock('@/lib/db', () => {
  const prismaMock: any = {
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.email === 'exists@example.com') return { id: 'uE', email: 'exists@example.com' };
        return null;
      }),
      create: vi.fn(async ({ data }: any) => ({ id: 'uNew', email: data.email })),
    },
    appSetting: {
      create: vi.fn(async () => ({})),
    }
  };
  return { getPrisma: vi.fn(async () => prismaMock) };
});

vi.mock('bcryptjs', () => ({
  hash: vi.fn(async () => '$2a$10$hash'),
}));

vi.mock('@/lib/dbReset', () => ({ wipeAllApplicationData: vi.fn(async () => {}) }));

// Import after mocks
import * as registerRoute from '../../src/app/api/auth/register/route';
import * as sec from '@/lib/security';

function makeReq(body: any) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    (sec as any).__setAllow?.(true);
  });

  it('returns 429 when rate limited', async () => {
    (sec as any).__setAllow(false);
    const req = makeReq({ email: 'new@example.com', password: 'complexPASS123!' });
    const res = await (registerRoute as any).POST(req);
    expect(res.status).toBe(429);
  });

  it('rejects invalid email/password with generic error', async () => {
    const req = makeReq({ email: 'bad', password: '' });
    const res = await (registerRoute as any).POST(req);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j).toHaveProperty('error', 'invalid_credentials');
  });

  it('rejects if email already exists', async () => {
    const req = makeReq({ email: 'exists@example.com', password: 'complexPASS123!' });
    const res = await (registerRoute as any).POST(req);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j).toHaveProperty('error');
  });

  it('creates a user and returns expected shape', async () => {
    const req = makeReq({ email: 'new@example.com', password: 'complexPASS123!', firstName: 'A', lastName: 'B', shopName: 'Shop' });
    const res = await (registerRoute as any).POST(req);
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j).toMatchObject({ id: expect.any(String), email: 'new@example.com' });
  });
});
