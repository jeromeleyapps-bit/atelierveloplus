/**
 * Tests for GET /api/catalog/low-stock
 * Tests low stock items endpoint
 */

import { GET } from '@/app/api/catalog/low-stock/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    catalogItem: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrismaCatalogItemFindMany = prisma.catalogItem.findMany as jest.Mock;

describe('GET /api/catalog/low-stock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return low stock items', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', stockQty: 5, minStock: 10, active: true },
      { id: '2', name: 'Item 2', stockQty: 2, minStock: 5, active: true },
      { id: '3', name: 'Item 3', stockQty: 15, minStock: 10, active: true },
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2); // Only items 1 and 2 are low stock
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('stockQty');
    expect(data[0]).toHaveProperty('minStock');
  });

  it('should filter only active items', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const res = await GET();

    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith({
      select: expect.any(Object),
      where: expect.objectContaining({
        active: true,
      }),
    });
  });

  it('should exclude supplier items', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const res = await GET();

    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith({
      select: expect.any(Object),
      where: expect.objectContaining({
        supplierName: null,
      }),
    });
  });

  it('should sort by stock deficit', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', stockQty: 5, minStock: 10, active: true }, // deficit: -5
      { id: '2', name: 'Item 2', stockQty: 0, minStock: 10, active: true }, // deficit: -10
      { id: '3', name: 'Item 3', stockQty: 8, minStock: 10, active: true }, // deficit: -2
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].id).toBe('2'); // Most critical
    expect(data[1].id).toBe('1');
    expect(data[2].id).toBe('3'); // Least critical
  });

  it('should limit to 20 items', async () => {
    const mockItems = Array.from({ length: 30 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      stockQty: 0,
      minStock: 10,
      active: true,
    }));

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(20);
  });

  it('should handle null stockQty', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', stockQty: null, minStock: 10, active: true },
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].stockQty).toBe(0);
  });

  it('should handle null minStock', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', stockQty: 5, minStock: null, active: true },
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(0); // Not low stock if minStock is null/0
  });

  it('should return empty array when no low stock items', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', stockQty: 15, minStock: 10, active: true },
      { id: '2', name: 'Item 2', stockQty: 20, minStock: 5, active: true },
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should handle database errors', async () => {
    mockPrismaCatalogItemFindMany.mockRejectedValue(new Error('DB error'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'low_stock_failed');
  });

  it('should handle empty database', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});

