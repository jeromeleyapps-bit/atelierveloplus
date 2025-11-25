import { GET } from '@/app/api/users/first/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;

describe('GET /api/users/first', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return first user', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockPrismaUserFindFirst.mockResolvedValue(mockUser);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  });

  it('should return 404 if no user found', async () => {
    mockPrismaUserFindFirst.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'no_user_found');
  });

  it('should handle database errors', async () => {
    mockPrismaUserFindFirst.mockRejectedValue(new Error('Database error'));

    await expect(GET()).rejects.toThrow('Database error');
  });
});

