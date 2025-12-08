import { GET } from '@/app/api/catalog/search/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { searchCatalogLocal } from '@/lib/catalog';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    catalogItem: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/catalog', () => ({
  searchCatalogLocal: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaCatalogItemFindMany = prisma.catalogItem.findMany as jest.Mock;
const mockSearchCatalogLocal = searchCatalogLocal as jest.Mock;

describe('GET /api/catalog/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search catalog items with query', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', sku: 'SKU-1', active: true },
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const req = createMockRequest('http://localhost:3000/api/catalog/search?q=Item') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          OR: expect.anything(),
        }),
      })
    );
  });

  it('should filter by category', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/catalog/search?category=PIECES') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'PIECES',
        }),
      })
    );
  });

  it('should normalize category aliases', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/catalog/search?category=pieces') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'PIECES',
        }),
      })
    );
  });

  it('should respect limit parameter', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/catalog/search?limit=50') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it('should cap limit at 100', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/catalog/search?limit=200') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('should use default limit of 20', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/catalog/search') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
      })
    );
  });

  it('should fallback to local search if Prisma unavailable', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;
    mockSearchCatalogLocal.mockReturnValue([{ id: '1', name: 'Local Item' }]);

    const req = createMockRequest('http://localhost:3000/api/catalog/search?q=test') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSearchCatalogLocal).toHaveBeenCalled();
    expect(data).toBeDefined();

    (prisma as any) = originalPrisma;
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaCatalogItemFindMany.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/catalog/search') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'catalog_search_failed');
  });
});

