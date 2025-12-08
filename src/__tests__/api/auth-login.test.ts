import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { compare } from 'bcryptjs';
import { rateLimit } from '@/lib/security';
import { generateToken } from '@/lib/jwt';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('@/lib/security', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/jwt', () => ({
  generateToken: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api-error', () => ({
  handleApiError: jest.fn((error) => {
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }),
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ allowed: true });
  });

  it('should return 401 for invalid credentials (missing email)', async () => {
    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    }) as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 401 for invalid credentials (missing password)', async () => {
    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 401 for invalid email format', async () => {
    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 401 when user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 401 when user is inactive', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'hashed',
      active: false,
    });

    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 401 when password is incorrect', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'hashed',
      active: true,
      role: 'user',
    });
    (compare as jest.Mock).mockResolvedValue(false);

    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 429 when rate limit exceeded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ allowed: false });

    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('too_many_requests');
  });

  it('should return token and user on successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashed',
      active: true,
      role: 'admin',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (compare as jest.Mock).mockResolvedValue(true);
    (generateToken as jest.Mock).mockResolvedValue('mock-jwt-token');

    const req = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('mock-jwt-token');
    expect(data.user.id).toBe('1');
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.role).toBe('admin');
    expect(generateToken).toHaveBeenCalledWith({
      userId: '1',
      email: 'test@example.com',
      role: 'admin',
    });
  });
});

