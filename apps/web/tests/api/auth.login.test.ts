import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('@/lib/security', () => {
  // mutable flag to control rate limit behavior per test
  let allow = true;
  return {
    rateLimit: vi.fn(async () => ({ allowed: allow, retryAfter: allow ? 0 : 60 })),
    __setAllow: (v: boolean) => { allow = v; },
  } as any;
});

vi.mock('@/lib/db', () => {
  const prismaMock: any = {
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.email === 'ok@example.com') {
          return { id: 'u1', email: 'ok@example.com', password: '$2a$10$hash', active: true };
        }
        if (where?.email === 'inactive@example.com') {
          return { id: 'u2', email: 'inactive@example.com', password: '$2a$10$hash', active: false };
        }
        return null;
      }),
    },
  };
  return { getPrisma: vi.fn(async () => prismaMock) };
});

vi.mock('bcryptjs', () => ({
  compare: vi.fn(async (pw: string) => pw === 'validpw'),
}));

// Import after mocks are set
import * as loginRoute from '../../src/app/api/auth/login/route';
import * as sec from '@/lib/security';

function makeReq(body: any) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    (sec as any).__setAllow?.(true);
  });

  it('returns 429 when rate limited', async () => {
    (sec as any).__setAllow(false);
    const req = makeReq({ email: 'ok@example.com', password: 'validpw' });
    const res = await (loginRoute as any).POST(req);
    expect(res.status).toBe(429);
    const j = await res.json();
    expect(j).toHaveProperty('error', 'too_many_requests');
  });

  it('rejects invalid inputs with generic error', async () => {
    const req = makeReq({ email: 'bad', password: '' });
    const res = await (loginRoute as any).POST(req);
    expect([400,401]).toContain(res.status);
    const j = await res.json();
    expect(j).toHaveProperty('error');
  });

  it('rejects inactive user generically', async () => {
    const req = makeReq({ email: 'inactive@example.com', password: 'validpw' });
    const res = await (loginRoute as any).POST(req);
    expect(res.status).toBe(401);
    const j = await res.json();
    expect(j).toHaveProperty('error', 'invalid_credentials');
  });

  it('accepts valid credentials and returns user shape', async () => {
    const req = makeReq({ email: 'ok@example.com', password: 'validpw' });
    const res = await (loginRoute as any).POST(req);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toMatchObject({ id: expect.any(String), email: 'ok@example.com' });
  });
});
