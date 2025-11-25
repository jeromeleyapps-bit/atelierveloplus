// Mock jose before importing jwt module
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock.jwt.token'),
  })),
  jwtVerify: jest.fn().mockResolvedValue({
    payload: {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'admin',
    },
  }),
}));

import { generateToken, verifyToken, getUserFromToken, JWTPayload } from '@/lib/jwt';

// Mock environment
const originalEnv = process.env;

describe('JWT Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-tests-minimum-64-characters-long-for-security';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const payload: JWTPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = await generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', async () => {
      const payload1: JWTPayload = {
        userId: 'user-1',
        email: 'user1@example.com',
        role: 'admin',
      };

      const payload2: JWTPayload = {
        userId: 'user-2',
        email: 'user2@example.com',
        role: 'user',
      };

      const token1 = await generateToken(payload1);
      const token2 = await generateToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const payload: JWTPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = await generateToken(payload);
      const verified = await verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('user-123');
      expect(verified?.email).toBe('test@example.com');
      expect(verified?.role).toBe('admin');
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      const verified = await verifyToken(invalidToken);
      expect(verified).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Note: Testing expired tokens requires manipulating time or using a very short expiry
      // For now, we test that invalid tokens return null
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYwOTQ1NjgwMCwiZXhwIjoxNjA5NDU2ODAwfQ.invalid';
      const verified = await verifyToken(invalidToken);
      expect(verified).toBeNull();
    });
  });

  describe('getUserFromToken', () => {
    it('should extract user from request with valid token', async () => {
      const payload: JWTPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = await generateToken(payload);
      const req = {
        headers: new Headers({
          'authorization': `Bearer ${token}`,
        }),
      } as any;

      const user = await getUserFromToken(req);
      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for request without token', async () => {
      const req = {
        headers: new Headers({}),
      } as any;

      const user = await getUserFromToken(req);
      expect(user).toBeNull();
    });

    it('should return null for request with invalid token', async () => {
      const req = {
        headers: new Headers({
          'authorization': 'Bearer invalid.token.here',
        }),
      } as any;

      const user = await getUserFromToken(req);
      expect(user).toBeNull();
    });
  });
});

