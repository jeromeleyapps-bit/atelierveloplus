/**
 * Tests de GET /api/auth/me
 *
 * Cette route sert à purger un jeton de session périmé au démarrage. Elle doit rester
 * STRICTE : un jeton signé avec un ancien JWT_SECRET, ou dont l'utilisateur n'existe
 * plus, doit être rejeté — sinon l'application repart en session fantôme et le wizard
 * de première configuration échoue silencieusement.
 */

import { GET as getMe } from '@/app/api/auth/me/route';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/jwt', () => ({
  getUserFromToken: jest.fn(),
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockGetUserFromToken = getUserFromToken as jest.Mock;

function req() {
  return new Request('http://localhost/api/auth/me', {
    headers: { Authorization: 'Bearer un-jeton' },
  });
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renvoie l'utilisateur quand le jeton est valide", async () => {
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-1' });
    mockFindUnique.mockResolvedValue({
      id: 'user-1', email: 'atelier@exemple.fr', name: 'Jean', role: 'admin', active: true,
    });

    const res = await getMe(req());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.id).toBe('user-1');
  });

  it('renvoie 401 quand le jeton est invalide (signé avec un ancien secret)', async () => {
    mockGetUserFromToken.mockResolvedValue(null);

    const res = await getMe(req());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("renvoie 401 quand l'utilisateur du jeton n'existe plus (base recréée)", async () => {
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-disparu' });
    mockFindUnique.mockResolvedValue(null);

    const res = await getMe(req());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('user_not_found');
  });

  it("renvoie 401 quand le compte est désactivé", async () => {
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-1' });
    mockFindUnique.mockResolvedValue({
      id: 'user-1', email: 'x@y.fr', name: null, role: 'admin', active: false,
    });

    const res = await getMe(req());

    expect(res.status).toBe(401);
  });
});
