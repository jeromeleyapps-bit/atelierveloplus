/**
 * Tests for GET/POST /api/bikes
 * Tests bike listing and creation
 */

import { GET, POST } from '@/app/api/bikes/route';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    bike: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
  ensureSqliteBikeMileageColumn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/jwt', () => ({
  getUserFromToken: jest.fn(),
}));

const mockGetUserFromToken = getUserFromToken as jest.Mock;
const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockPrismaBikeFindMany = prisma.bike.findMany as jest.Mock;
const mockPrismaBikeCreate = prisma.bike.create as jest.Mock;

describe('GET /api/bikes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-123' });
  });

  it('should list all bikes', async () => {
    const mockBikes = [
      { id: 'bike-1', brand: 'Trek', model: 'FX3', type: 'city', active: true },
      { id: 'bike-2', brand: 'Giant', model: 'Escape', type: 'city', active: true },
    ];

    mockPrismaBikeFindMany.mockResolvedValue(mockBikes);

    const req = new NextRequest('http://localhost/api/bikes');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockPrismaBikeFindMany).toHaveBeenCalled();
  });

  it('should filter bikes by type', async () => {
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes?type=city');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'city',
        }),
      })
    );
  });

  it('should filter bikes by condition', async () => {
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes?condition=new');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          condition: 'new',
        }),
      })
    );
  });

  it('should filter bikes by brand', async () => {
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes?brand=Trek');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brand: { contains: 'Trek' },
        }),
      })
    );
  });

  it('should filter bikes by price range', async () => {
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes?minPrice=100&maxPrice=500');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sellingPriceHT: {
            gte: 100,
            lte: 500,
          },
        }),
      })
    );
  });

  it('should filter active bikes by default', async () => {
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
        }),
      })
    );
  });

  it('should include inactive bikes when active=false', async () => {
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes?active=false');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBikeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: undefined,
        }),
      })
    );
  });

  it('should use first user when no JWT', async () => {
    mockGetUserFromToken.mockResolvedValue(null);
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'first-user' });
    mockPrismaBikeFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/bikes');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserFindFirst).toHaveBeenCalled();
  });

  it('should return 404 if no user found', async () => {
    mockGetUserFromToken.mockResolvedValue(null);
    mockPrismaUserFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/bikes');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'no_user_found');
  });

  it('should handle database errors', async () => {
    mockPrismaBikeFindMany.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/bikes');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});

describe('POST /api/bikes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-123' });
  });

  it('should create a bike', async () => {
    const mockBike = {
      id: 'bike-1',
      brand: 'Trek',
      model: 'FX3',
      year: 2023,
      size: 'M',
      type: 'city',
      condition: 'new',
      purchasePriceHT: 400,
      sellingPriceHT: 500,
      active: true,
      userId: 'user-123',
    };

    mockPrismaBikeCreate.mockResolvedValue(mockBike);

    const req = new NextRequest('http://localhost/api/bikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'Trek',
        model: 'FX3',
        year: 2023,
        size: 'M',
        type: 'city',
        condition: 'new',
        purchasePriceHT: 400,
        sellingPriceHT: 500,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({
      brand: 'Trek',
      model: 'FX3',
    });
    expect(mockPrismaBikeCreate).toHaveBeenCalled();
  });

  it('should use first user when no JWT', async () => {
    mockGetUserFromToken.mockResolvedValue(null);
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'first-user' });
    mockPrismaBikeCreate.mockResolvedValue({ id: 'bike-1' });

    const req = new NextRequest('http://localhost/api/bikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'Trek',
        model: 'FX3',
        year: 2023,
        size: 'M',
        purchasePriceHT: 400,
        sellingPriceHT: 500,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPrismaUserFindFirst).toHaveBeenCalled();
  });

  it('should return 404 if no user found', async () => {
    mockGetUserFromToken.mockResolvedValue(null);
    mockPrismaUserFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/bikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'Trek',
        model: 'FX3',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'no_user_found');
  });

  it('should handle database errors', async () => {
    mockPrismaBikeCreate.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/bikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: 'Trek',
        model: 'FX3',
        year: 2023,
        size: 'M',
        purchasePriceHT: 400,
        sellingPriceHT: 500,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});
