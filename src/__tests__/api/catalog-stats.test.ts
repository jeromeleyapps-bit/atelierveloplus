/**
 * Tests for GET /api/catalog/stats
 * Tests catalog statistics endpoint
 */

import { GET } from '@/app/api/catalog/stats/route';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    catalogItem: {
      findMany: jest.fn(),
    },
    supplierOffer: {
      findMany: jest.fn(),
    },
    bike: {
      findMany: jest.fn(),
    },
    serviceRate: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/jwt', () => ({
  getUserFromToken: jest.fn(),
}));

const mockGetUserFromToken = getUserFromToken as jest.Mock;
const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockPrismaCatalogItemFindMany = prisma.catalogItem.findMany as jest.Mock;
const mockPrismaSupplierOfferFindMany = prisma.supplierOffer.findMany as jest.Mock;
const mockPrismaBikeFindMany = prisma.bike.findMany as jest.Mock;
const mockPrismaServiceRateFindMany = prisma.serviceRate.findMany as jest.Mock;

describe('GET /api/catalog/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserFromToken.mockResolvedValue({ userId: 'user-123' });
  });

  it('should return catalog statistics', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([
      { supplierName: null, priceHT: 10, stockQty: 5, minStock: 3 },
      { supplierName: 'Supplier', priceHT: 20, stockQty: 10, minStock: 5 },
    ]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    mockPrismaBikeFindMany.mockResolvedValue([
      { condition: 'NEW', isElectric: true, sellingPriceHT: 500, stock: 1 },
      { condition: 'USED', isElectric: false, sellingPriceHT: 300, stock: 2 },
    ]);
    mockPrismaServiceRateFindMany.mockResolvedValue([
      { id: '1', category: 'maintenance', updatedAt: new Date('2024-01-15') },
      { id: '2', category: 'repair', updatedAt: new Date('2024-01-20') },
    ]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('piecesCount', 1);
    expect(data).toHaveProperty('piecesValueHT', 50);
    expect(data).toHaveProperty('piecesSupplierCount', 1);
    expect(data).toHaveProperty('b2bOffersCount', 2);
    expect(data).toHaveProperty('bikesCount', 2);
    expect(data).toHaveProperty('bikesNew', 1);
    expect(data).toHaveProperty('bikesUsed', 1);
    expect(data).toHaveProperty('bikesElectric', 1);
    expect(data).toHaveProperty('servicesCount', 2);
    expect(data).toHaveProperty('servicesCategories', 2);
  });

  it('should calculate low stock items', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([
      { supplierName: null, priceHT: 10, stockQty: 2, minStock: 5 }, // Low stock
      { supplierName: null, priceHT: 10, stockQty: 10, minStock: 5 }, // OK
    ]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([]);
    mockPrismaBikeFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.piecesLowStock).toBe(1);
  });

  it('should calculate bikes in stock', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([]);
    mockPrismaBikeFindMany.mockResolvedValue([
      { condition: 'NEW', isElectric: false, sellingPriceHT: 500, stock: 1 },
      { condition: 'NEW', isElectric: false, sellingPriceHT: 500, stock: 0 },
    ]);
    mockPrismaServiceRateFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bikesInStock).toBe(1);
  });

  it('should calculate bikes value', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([]);
    mockPrismaBikeFindMany.mockResolvedValue([
      { condition: 'NEW', isElectric: false, sellingPriceHT: 500, stock: 2 },
      { condition: 'NEW', isElectric: false, sellingPriceHT: 300, stock: 1 },
    ]);
    mockPrismaServiceRateFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.bikesValueHT).toBe(1300); // (500*2) + (300*1)
  });

  it('should count unique service categories', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([]);
    mockPrismaBikeFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindMany.mockResolvedValue([
      { id: '1', category: 'maintenance', updatedAt: new Date() },
      { id: '2', category: 'maintenance', updatedAt: new Date() },
      { id: '3', category: 'repair', updatedAt: new Date() },
    ]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.servicesCategories).toBe(2);
  });

  it('should use first user when no JWT', async () => {
    mockGetUserFromToken.mockResolvedValue(null);
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'first-user' });
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([]);
    mockPrismaBikeFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserFindFirst).toHaveBeenCalled();
  });

  it('should return 404 if no user found', async () => {
    mockGetUserFromToken.mockResolvedValue(null);
    mockPrismaUserFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'no_user_found');
  });

  it('should handle database errors', async () => {
    mockPrismaCatalogItemFindMany.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  it('should handle empty data', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaSupplierOfferFindMany.mockResolvedValue([]);
    mockPrismaBikeFindMany.mockResolvedValue([]);
    mockPrismaServiceRateFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/catalog/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.piecesCount).toBe(0);
    expect(data.bikesCount).toBe(0);
    expect(data.servicesCount).toBe(0);
  });
});

