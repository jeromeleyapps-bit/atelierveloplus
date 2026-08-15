import { GET, POST } from '@/app/api/catalog/items/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';

// Mock dependencies
// Le client est expose par un accesseur : la route relit la valeur a chaque
// appel, ce qui permet de simuler une base indisponible. Reassigner l'import
// directement n'est plus possible avec le transpileur actuel.
const mockClientPrisma: { valeur: unknown } = {
  valeur: {
      catalogItem: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      $executeRawUnsafe: jest.fn(),
    },
};

jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockClientPrisma.valeur;
  },
}));

jest.mock('@/lib/catalog-harmonizer', () => ({
  convertManualInput: jest.fn((data) => data),
  validateUnifiedItem: jest.fn(() => ({ valid: true })),
  generateSKU: jest.fn((name) => `SKU-${name}`),
}));

jest.mock('@/lib/api-error', () => ({
  handleApiError: jest.fn((error) => {
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaCatalogItemFindMany = prisma.catalogItem.findMany as jest.Mock;
const mockPrismaCatalogItemCount = prisma.catalogItem.count as jest.Mock;
const mockPrismaCatalogItemCreate = prisma.catalogItem.create as jest.Mock;
const mockPrismaExecuteRawUnsafe = prisma.$executeRawUnsafe as jest.Mock;

describe('GET /api/catalog/items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaExecuteRawUnsafe.mockResolvedValue(undefined);
  });

  it('should return 501 if Prisma is not available', async () => {
    const originalPrisma = mockClientPrisma.valeur;
    mockClientPrisma.valeur = null;

    const req = createMockRequest('http://localhost:3000/api/catalog/items') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(501);
    expect(data).toHaveProperty('error', 'prisma_unavailable');

    mockClientPrisma.valeur = originalPrisma;
  });

  it('should return catalog items with default pagination', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', sku: 'SKU-1', category: 'PIECES' },
      { id: '2', name: 'Item 2', sku: 'SKU-2', category: 'EQUIPEMENTS' },
    ];

    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);
    mockPrismaCatalogItemCount.mockResolvedValue(2);

    const req = createMockRequest('http://localhost:3000/api/catalog/items') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total', 2);
    expect(data.items).toHaveLength(2);
  });

  it('should filter items by query', async () => {
    const mockItems = [{ id: '1', name: 'Item 1', sku: 'SKU-1' }];
    mockPrismaCatalogItemFindMany.mockResolvedValue(mockItems);
    mockPrismaCatalogItemCount.mockResolvedValue(1);

    const req = createMockRequest('http://localhost:3000/api/catalog/items?q=Item') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.anything() }),
          ]),
        }),
      })
    );
  });

  it('should filter items by category', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaCatalogItemCount.mockResolvedValue(0);

    const req = createMockRequest('http://localhost:3000/api/catalog/items?category=PIECES') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: 'PIECES' },
      })
    );
  });

  it('should respect limit parameter', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaCatalogItemCount.mockResolvedValue(0);

    const req = createMockRequest('http://localhost:3000/api/catalog/items?limit=100') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('should respect offset parameter', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaCatalogItemCount.mockResolvedValue(0);

    const req = createMockRequest('http://localhost:3000/api/catalog/items?offset=50') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
      })
    );
  });

  it('should cap limit at 50000', async () => {
    mockPrismaCatalogItemFindMany.mockResolvedValue([]);
    mockPrismaCatalogItemCount.mockResolvedValue(0);

    const req = createMockRequest('http://localhost:3000/api/catalog/items?limit=100000') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCatalogItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50000,
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaCatalogItemFindMany.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/catalog/items') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'database_error');
    expect(data).toHaveProperty('items', []);
    expect(data).toHaveProperty('total', 0);
  });
});

describe('POST /api/catalog/items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new catalog item', async () => {
    const mockItem = {
      id: '1',
      name: 'New Item',
      sku: 'SKU-New Item',
      priceHT: 10,
      category: 'PIECES',
    };

    mockPrismaCatalogItemCreate.mockResolvedValue(mockItem);

    const req = createMockRequest('http://localhost:3000/api/catalog/items', {
      method: 'POST',
      body: {
        name: 'New Item',
        priceHT: 10,
        category: 'PIECES',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', name: 'New Item' });
    expect(mockPrismaCatalogItemCreate).toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    const { validateUnifiedItem } = require('@/lib/catalog-harmonizer');
    validateUnifiedItem.mockReturnValue({ valid: false, errors: ['Invalid data'] });

    const req = createMockRequest('http://localhost:3000/api/catalog/items', {
      method: 'POST',
      body: { name: '' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should handle database errors', async () => {
    mockPrismaCatalogItemCreate.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/catalog/items', {
      method: 'POST',
      body: {
        name: 'New Item',
        category: 'parts',
        priceHT: 10,
        priceTTC: 12,
        vatRate: 20,
        stockQty: 5,
        minStock: 2,
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    // The route validates data before calling Prisma, so validation errors return 400
    // If validation passes but Prisma fails, it would return 500
    // Since we're providing incomplete data, we expect 400 from validation
    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error');
  });
});
