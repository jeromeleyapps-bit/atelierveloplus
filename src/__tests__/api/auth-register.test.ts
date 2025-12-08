import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { hash } from 'bcryptjs';
import { rateLimit, validatePasswordComplexity, isPasswordBreached } from '@/lib/security';
import { generateToken } from '@/lib/jwt';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    appSetting: {
      upsert: jest.fn(),
    },
    systemSettings: {
      upsert: jest.fn(),
    },
    globalSetting: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('@/lib/security', () => ({
  rateLimit: jest.fn(),
  validatePasswordComplexity: jest.fn(),
  isPasswordBreached: jest.fn(),
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

jest.mock('@/lib/dbReset', () => ({
  wipeAllApplicationData: jest.fn(),
}));

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ allowed: true });
    (validatePasswordComplexity as jest.Mock).mockReturnValue(true);
    (isPasswordBreached as jest.Mock).mockResolvedValue(false);
    (hash as jest.Mock).mockResolvedValue('hashed-password');
    (generateToken as jest.Mock).mockResolvedValue('mock-jwt-token');
  });

  it('should return 400 for missing email', async () => {
    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 400 for missing password', async () => {
    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 400 for invalid email format', async () => {
    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 400 for weak password', async () => {
    (validatePasswordComplexity as jest.Mock).mockReturnValue(false);

    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'weak' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 400 when email already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
    });

    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('email_already_exists');
  });

  it('should return 400 for breached password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (isPasswordBreached as jest.Mock).mockResolvedValue(true);

    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid_credentials');
  });

  it('should return 429 when rate limit exceeded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ allowed: false });

    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('too_many_requests');
  });

  it('should create user and return token on successful registration', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
    (prisma.appSetting.upsert as jest.Mock).mockResolvedValue({});
    (prisma.systemSettings.upsert as jest.Mock).mockResolvedValue({});

    const req = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        shopName: 'Test Shop',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.token).toBe('mock-jwt-token');
    expect(data.user.id).toBe('1');
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.shopName).toBe('Test Shop');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.appSetting.upsert).toHaveBeenCalled();
    expect(prisma.systemSettings.upsert).toHaveBeenCalled();
  });
});

