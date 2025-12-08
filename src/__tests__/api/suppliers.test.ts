import { GET, POST } from '@/app/api/suppliers/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { getUserId } from '@/lib/api-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    supplier: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    supplierCredential: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaSupplierFindMany = prisma.supplier.findMany as jest.Mock;
const mockPrismaTransaction = prisma.$transaction as jest.Mock;
const mockGetUserId = getUserId as jest.Mock;

describe('GET /api/suppliers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all suppliers', async () => {
    const mockSuppliers = [
      { id: '1', name: 'Supplier 1', connectorType: 'MOCK' },
      { id: '2', name: 'Supplier 2', connectorType: 'MOCK' },
    ];

    mockPrismaSupplierFindMany.mockResolvedValue(mockSuppliers);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ id: '1', name: 'Supplier 1' });
    expect(mockPrismaSupplierFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('should handle empty suppliers list', async () => {
    mockPrismaSupplierFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});

describe('POST /api/suppliers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if name is missing', async () => {
    const req = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: {},
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'invalid_payload');
  });

  it('should create a supplier without credentials', async () => {
    const mockSupplier = {
      id: '1',
      name: 'New Supplier',
      connectorType: 'MOCK',
    };

    mockGetUserId.mockReturnValue(null);
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const tx = {
        supplier: {
          create: jest.fn().mockResolvedValue(mockSupplier),
        },
      };
      return callback(tx);
    });

    const req = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: {
        name: 'New Supplier',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', name: 'New Supplier' });
  });

  it('should create supplier with credentials when userId provided', async () => {
    const mockSupplier = {
      id: '1',
      name: 'New Supplier',
      connectorType: 'MOCK',
    };

    mockGetUserId.mockReturnValue('user-123');
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const tx = {
        supplier: {
          create: jest.fn().mockResolvedValue(mockSupplier),
        },
        supplierCredential: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const req = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: {
        name: 'New Supplier',
        username: 'user',
        password: 'pass',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', name: 'New Supplier' });
  });

  it('should update existing credentials when supplier already has credentials', async () => {
    const mockSupplier = {
      id: '1',
      name: 'New Supplier',
      connectorType: 'MOCK',
    };

    const mockExistingCredential = {
      id: 'cred-1',
      supplierId: '1',
      userId: 'user-123',
    };

    mockGetUserId.mockReturnValue('user-123');
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const tx = {
        supplier: {
          create: jest.fn().mockResolvedValue(mockSupplier),
        },
        supplierCredential: {
          findFirst: jest.fn().mockResolvedValue(mockExistingCredential),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const req = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: {
        name: 'New Supplier',
        username: 'updated-user',
        password: 'updated-pass',
      },
    }) as any;

    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it('should handle invalid JSON body gracefully', async () => {
    const req = {
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'invalid_payload');
  });
});
