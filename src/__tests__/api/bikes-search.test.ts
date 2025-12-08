import { GET } from '@/app/api/bikes/search/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: jest.fn(),
    },
    workOrder: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaCustomerFindMany = prisma.customer.findMany as jest.Mock;
const mockPrismaWorkOrderFindFirst = prisma.workOrder.findFirst as jest.Mock;

describe('GET /api/bikes/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 503 if Prisma is not available', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;

    const req = createMockRequest('http://localhost:3000/api/bikes/search?q=test') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'prisma_unavailable');

    (prisma as any) = originalPrisma;
  });

  it('should return message if query is too short', async () => {
    // Create NextRequest mock with searchParams
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams('q=a'),
      },
    } as any;

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('customers', []);
    expect(data).toHaveProperty('message', 'Entrez au moins 2 caractères');
  });

  it('should return message if query is empty', async () => {
    // Create NextRequest mock with empty searchParams
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams(''),
      },
    } as any;

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('customers', []);
    expect(data).toHaveProperty('message', 'Entrez au moins 2 caractères');
  });

  it('should search customers by name', async () => {
    const mockCustomers = [
      {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        CustomerBike: [],
      },
    ];

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);
    mockPrismaWorkOrderFindFirst.mockResolvedValue(null);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams('q=john'),
      },
    } as any;

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('customers');
    expect(data).toHaveProperty('count', 1);
    expect(mockPrismaCustomerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ firstName: expect.anything() }),
            expect.objectContaining({ lastName: expect.anything() }),
          ]),
        }),
      })
    );
  });

  it('should limit results to 10 customers', async () => {
    mockPrismaCustomerFindMany.mockResolvedValue([]);

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams('q=test'),
      },
    } as any;

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCustomerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaCustomerFindMany.mockRejectedValue(new Error('Database error'));

    const req = {
      nextUrl: {
        searchParams: new URLSearchParams('q=test'),
      },
    } as any;

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'Erreur lors de la recherche');
  });
});

