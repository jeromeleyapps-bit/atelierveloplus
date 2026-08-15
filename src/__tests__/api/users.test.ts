/**
 * Tests for GET /api/users/first and PATCH /api/user/profile
 * Tests user endpoints
 */

import { GET as getFirstUser } from '@/app/api/users/first/route';
import { PATCH as patchUserProfile } from '@/app/api/user/profile/route';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/jwt', () => ({
  getUserFromToken: jest.fn(),
}));

const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockPrismaUserUpdate = prisma.user.update as jest.Mock;
const mockGetUserFromToken = getUserFromToken as jest.Mock;

describe('GET /api/users/first', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the first user', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockPrismaUserFindFirst.mockResolvedValue(mockUser);

    const res = await getFirstUser();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject(mockUser);
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

    const res = await getFirstUser();
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'no_user_found');
  });
});

describe('PATCH /api/user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-123' });
    // Par défaut l'utilisateur du jeton existe en base.
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user-123' });
  });

  it('should update user profile', async () => {
    const mockUpdatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Updated Name',
      role: 'user',
    };

    mockPrismaUserUpdate.mockResolvedValue(mockUpdatedUser);

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    const res = await patchUserProfile(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject(mockUpdatedUser);
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'Updated Name' },
      select: { id: true, email: true, name: true, role: true },
    });
  });

  it('should trim whitespace from name', async () => {
    mockPrismaUserUpdate.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Trimmed Name',
      role: 'user',
    });

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Trimmed Name  ' }),
    });

    const res = await patchUserProfile(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Trimmed Name' },
      })
    );
  });

  it('should handle null name', async () => {
    mockPrismaUserUpdate.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: null,
      role: 'user',
    });

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: null }),
    });

    const res = await patchUserProfile(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: null },
      })
    );
  });

  it('should require authentication', async () => {
    mockGetUserFromToken.mockResolvedValue(null);

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });

    const res = await patchUserProfile(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should handle invalid JSON body', async () => {
    mockPrismaUserUpdate.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: null,
      role: 'user',
    });

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const res = await patchUserProfile(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: null },
      })
    );
  });

  it('should handle database errors', async () => {
    mockPrismaUserUpdate.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });

    const res = await patchUserProfile(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  // Régression : le wizard de première configuration échouait ici (401 puis 500),
  // ce qui bloquait l'écran d'accueil sans message visible.
  describe('identité Electron locale (wizard de première configuration)', () => {
    it("retombe sur le premier utilisateur actif quand l'identité du jeton n'existe pas en base", async () => {
      mockGetUserFromToken.mockResolvedValue({ userId: 'electron-local' });
      mockPrismaUserFindUnique.mockResolvedValue(null); // 'electron-local' n'existe pas
      mockPrismaUserFindFirst.mockResolvedValue({ id: 'user-reel-1' });
      mockPrismaUserUpdate.mockResolvedValue({
        id: 'user-reel-1', email: 'atelier@exemple.fr', name: 'Jean Test', role: 'admin',
      });

      const req = new Request('http://localhost/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Jean Test' }),
      });

      const res = await patchUserProfile(req);

      expect(res.status).toBe(200);
      expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-reel-1' } })
      );
    });

    it('renvoie 404 no_user quand la base ne contient aucun utilisateur', async () => {
      mockGetUserFromToken.mockResolvedValue({ userId: 'electron-local' });
      mockPrismaUserFindUnique.mockResolvedValue(null);
      mockPrismaUserFindFirst.mockResolvedValue(null);

      const req = new Request('http://localhost/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Jean Test' }),
      });

      const res = await patchUserProfile(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('no_user');
      expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
    });

    it('refuse toujours une requête sans identité valide', async () => {
      mockGetUserFromToken.mockResolvedValue(null);

      const req = new Request('http://localhost/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Jean Test' }),
      });

      const res = await patchUserProfile(req);

      expect(res.status).toBe(401);
      expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
    });
  });
});


