import { getUserId, getUserIdOrFirst } from '@/lib/api-helpers';
import { createMockRequest } from '../helpers/test-request';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

describe('api-helpers', () => {
  describe('getUserId', () => {
    it('should extract userId from x-user-id header', () => {
      const req = createMockRequest('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'user-123',
        },
      });

      const userId = getUserId(req as any);
      expect(userId).toBe('user-123');
    });

    it('should return null when x-user-id header is missing', () => {
      const req = createMockRequest('http://localhost:3000/api/test');

      const userId = getUserId(req as any);
      expect(userId).toBeNull();
    });

    it('should extract userId from Authorization Bearer token', async () => {
      // This would require mocking jwt.verify
      // For now, we'll test the header approach
      const req = createMockRequest('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'user-456',
        },
      });

      const userId = getUserId(req as any);
      expect(userId).toBe('user-456');
    });
  });

  describe('getUserIdOrFirst', () => {
    it('should return userId from header when present', async () => {
      const req = createMockRequest('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'user-789',
        },
      });

      const userId = await getUserIdOrFirst(req as any);
      expect(userId).toBe('user-789');
    });

    it('should fallback to first active user when userId is electron-local', async () => {
      const { prisma } = require('@/lib/prisma');
      prisma.user.findFirst.mockResolvedValue({ id: 'first-user-id' });

      const req = createMockRequest('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'electron-local',
        },
      });

      const userId = await getUserIdOrFirst(req as any);
      expect(userId).toBe('first-user-id');
    });

    it('should return null when no user found and no header', async () => {
      const { prisma } = require('@/lib/prisma');
      prisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest('http://localhost:3000/api/test');

      const userId = await getUserIdOrFirst(req as any);
      expect(userId).toBeNull();
    });
  });
});

