/**
 * Tests for GET /api/debug/env
 * Tests debug environment endpoint
 */

import { GET } from '@/app/api/debug/env/route';

describe('GET /api/debug/env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return environment information', async () => {
    process.env.DATABASE_URL = 'file:./test.db';
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('dbInfo');
    expect(data).toHaveProperty('dbFiles');
    expect(data).toHaveProperty('allEnvVars');
  });

  it('should handle missing DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dbInfo.DATABASE_URL).toBe('NON DEFINIE');
  });

  it('should include NODE_ENV', async () => {
    process.env.NODE_ENV = 'production';

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dbInfo.NODE_ENV).toBe('production');
  });

  it('should include current working directory', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dbInfo.cwd).toBe(process.cwd());
  });

  it('should return all env vars', async () => {
    process.env.DATABASE_URL = 'file:./test.db';
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true, configurable: true });
    process.env.VERCEL = '1';

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.allEnvVars).toHaveProperty('DATABASE_URL');
    expect(data.allEnvVars).toHaveProperty('NODE_ENV');
    expect(data.allEnvVars).toHaveProperty('VERCEL');
  });
});


