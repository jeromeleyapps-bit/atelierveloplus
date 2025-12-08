import { GET, PUT, DELETE } from '@/app/api/catalog/items/[id]/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    catalogItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    invoiceLine: {
      count: jest.fn(),
    },
    stockMovement: {
      count: jest.fn(),
    },
    supplierItem: {
      deleteMany: jest.fn(),
    },
    supplierOffer: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
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

const mockPrismaCatalogItemFindUnique = prisma.catalogItem.findUnique as jest.Mock;
const mockPrismaCatalogItemUpdate = prisma.catalogItem.update as jest.Mock;
const mockPrismaCatalogItemDelete = prisma.catalogItem.delete as jest.Mock;
const mockPrismaInvoiceLineCount = prisma.invoiceLine.count as jest.Mock;
const mockPrismaStockMovementCount = prisma.stockMovement.count as jest.Mock;
const mockPrismaTransaction = prisma.$transaction as jest.Mock;

describe('GET /api/catalog/items/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return catalog item by id', async () => {
    const mockItem = {
      id: 'item-1',
      name: 'Test Item',
      sku: 'SKU-1',
    };

    mockPrismaCatalogItemFindUnique.mockResolvedValue(mockItem);

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1') as any;
    const params = Promise.resolve({ id: 'item-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ id: 'item-1', name: 'Test Item' });
  });

  it('should return 404 if item not found', async () => {
    mockPrismaCatalogItemFindUnique.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/catalog/items/non-existent') as any;
    const params = Promise.resolve({ id: 'non-existent' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'not_found');
  });
});

describe('PUT /api/catalog/items/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update catalog item', async () => {
    const mockUpdatedItem = {
      id: 'item-1',
      name: 'Updated Item',
      priceHT: 50,
    };

    mockPrismaCatalogItemUpdate.mockResolvedValue(mockUpdatedItem);

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1', {
      method: 'PUT',
      body: {
        name: 'Updated Item',
        priceHT: 50,
      },
    }) as any;

    const params = Promise.resolve({ id: 'item-1' });
    const res = await PUT(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ id: 'item-1', name: 'Updated Item' });
    expect(mockPrismaCatalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { name: 'Updated Item', priceHT: 50 },
    });
  });

  it('should handle database errors', async () => {
    mockPrismaCatalogItemUpdate.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1', {
      method: 'PUT',
      body: { name: 'Updated' },
    }) as any;

    const params = Promise.resolve({ id: 'item-1' });
    const res = await PUT(req, { params });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/catalog/items/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete catalog item when no references', async () => {
    mockPrismaInvoiceLineCount.mockResolvedValue(0);
    mockPrismaStockMovementCount.mockResolvedValue(0);
    mockPrismaTransaction.mockResolvedValue([{}, {}, {}]);

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1', {
      method: 'DELETE',
    }) as any;

    const params = Promise.resolve({ id: 'item-1' });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    expect(mockPrismaTransaction).toHaveBeenCalled();
  });

  it('should return 409 if item has invoice line references', async () => {
    mockPrismaInvoiceLineCount.mockResolvedValue(5);
    mockPrismaStockMovementCount.mockResolvedValue(0);

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1', {
      method: 'DELETE',
    }) as any;

    const params = Promise.resolve({ id: 'item-1' });
    const res = await DELETE(req, { params });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data).toHaveProperty('error', 'conflict');
    expect(data).toHaveProperty('references');
  });

  it('should return 409 if item has stock movement references', async () => {
    mockPrismaInvoiceLineCount.mockResolvedValue(0);
    mockPrismaStockMovementCount.mockResolvedValue(3);

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1', {
      method: 'DELETE',
    }) as any;

    const params = Promise.resolve({ id: 'item-1' });
    const res = await DELETE(req, { params });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data).toHaveProperty('error', 'conflict');
  });

  it('should handle database errors', async () => {
    mockPrismaInvoiceLineCount.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/catalog/items/item-1', {
      method: 'DELETE',
    }) as any;

    const params = Promise.resolve({ id: 'item-1' });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(500);
  });
});

