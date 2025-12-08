// Mock jose before importing jwt module
let mockTokenCounter = 0;
const tokenPayloadMap = new Map<string, any>();

jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation((payload: any) => {
    return {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setIssuer: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockImplementation(async () => {
        // Generate unique token with JWT format (header.payload.signature)
        const tokenId = ++mockTokenCounter;
        const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(payload)).toString('base64')}.sig${tokenId}`;
        tokenPayloadMap.set(token, payload);
        return token;
      }),
    };
  }),
  jwtVerify: jest.fn().mockImplementation((token: string, secret: any, options: any) => {
    // Handle invalid/expired tokens
    if (token === 'invalid-token' || token === 'expired-token' || token === 'invalid.token.here') {
      return Promise.reject(new Error('Invalid token'));
    }
    
    // Check issuer if provided
    if (options?.issuer && options.issuer !== 'atelier-velo') {
      return Promise.reject(new Error('Invalid issuer'));
    }
    
    // Try to get payload from map
    const payload = tokenPayloadMap.get(token);
    if (payload) {
      return Promise.resolve({
        payload: payload, // Return payload as-is without adding 'id'
      });
    }
    
    // Fallback: try to decode from token
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString();
        const decodedPayload = JSON.parse(payloadStr);
        
        // Check if token is expired
        if (decodedPayload.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (decodedPayload.exp <= now) {
            return Promise.reject(new Error('Token expired'));
          }
        }
        
        return Promise.resolve({
          payload: decodedPayload,
        });
      }
    } catch {
      // Ignore decode errors
    }
    
    // If we can't decode, reject
    return Promise.reject(new Error('Invalid token format'));
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
      expect(user?.userId).toBe('user-123');
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

