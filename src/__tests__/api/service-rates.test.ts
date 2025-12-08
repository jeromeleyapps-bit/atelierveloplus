/**
 * Tests for GET /api/service-rates
 * Tests service rates endpoint
 */

import { GET } from '@/app/api/service-rates/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    serviceRate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockPrismaServiceRateFindMany = prisma.serviceRate.findMany as jest.Mock;
const mockPrismaServiceRateFindFirst = prisma.serviceRate.findFirst as jest.Mock;

describe('GET /api/service-rates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all service rates', async () => {
    const mockServiceRates = [
      { id: '1', name: 'Basic Tune-up', category: 'maintenance', bikeType: 'road', priceHT: 50, active: true },
      { id: '2', name: 'Full Service', category: 'maintenance', bikeType: 'mountain', priceHT: 100, active: true },
    ];

    const mockLastUpdate = { updatedAt: new Date('2024-01-15') };

    mockPrismaServiceRateFindMany.mockResolvedValue(mockServiceRates);
    mockPrismaServiceRateFindFirst.mockResolvedValue(mockLastUpdate);

    const req = new NextRequest('http://localhost/api/service-rates');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('serviceRates');
    expect(data.serviceRates).toHaveLength(2);
    expect(data).toHaveProperty('lastUpdate');
  });

  it('should filter by active status', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates?active=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaServiceRateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
        }),
      })
    );
  });

  it('should filter by bike type', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates?bikeType=road');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaServiceRateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bikeType: 'road',
        }),
      })
    );
  });

  it('should filter by category', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates?category=maintenance');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaServiceRateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'maintenance',
        }),
      })
    );
  });

  it('should combine multiple filters', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates?active=true&bikeType=road&category=maintenance');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaServiceRateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          bikeType: 'road',
          category: 'maintenance',
        }),
      })
    );
  });

  it('should order by category and name', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaServiceRateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    );
  });

  it('should handle null lastUpdate', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lastUpdate).toBeNull();
  });

  it('should handle database errors', async () => {
    mockPrismaServiceRateFindMany.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/service-rates');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  it('should return empty array when no service rates', async () => {
    mockPrismaServiceRateFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/service-rates');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.serviceRates).toEqual([]);
  });
});
