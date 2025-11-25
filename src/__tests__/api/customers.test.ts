import { GET, POST } from '@/app/api/customers/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    customerBike: {
      upsert: jest.fn(),
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
const mockPrismaCustomerCreate = prisma.customer.create as jest.Mock;
const mockPrismaCustomerBikeUpsert = prisma.customerBike.upsert as jest.Mock;

describe('GET /api/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all customers when no query parameter', async () => {
    const mockCustomers = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0123456789',
        _count: { CustomerBike: 2 },
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        _count: { CustomerBike: 1 },
      },
    ];

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);

    const req = createMockRequest('http://localhost:3000/api/customers') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      bikesCount: 2,
    });
    expect(mockPrismaCustomerFindMany).toHaveBeenCalled();
  });

  it('should filter customers by query parameter', async () => {
    const mockCustomers = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0123456789',
        _count: { CustomerBike: 0 },
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        _count: { CustomerBike: 0 },
      },
    ];

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);

    const req = createMockRequest('http://localhost:3000/api/customers?q=john') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].firstName).toBe('John');
  });

  it('should limit results to 200 customers', async () => {
    const mockCustomers = Array.from({ length: 250 }, (_, i) => ({
      id: `${i}`,
      firstName: `Customer${i}`,
      lastName: 'Test',
      email: `customer${i}@example.com`,
      phone: null,
      _count: { CustomerBike: 0 },
    }));

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);

    const req = createMockRequest('http://localhost:3000/api/customers') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(200);
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaCustomerFindMany.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/customers') as any;
    
    await expect(GET(req)).rejects.toThrow();
  });
});

describe('POST /api/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new customer', async () => {
    const mockCustomer = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '0123456789',
      address1: '123 Main St',
      city: 'Paris',
      zip: '75001',
      country: 'France',
    };

    mockPrismaCustomerCreate.mockResolvedValue(mockCustomer);
    mockPrismaCustomerBikeUpsert.mockResolvedValue({});

    const req = createMockRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0123456789',
        address1: '123 Main St',
        city: 'Paris',
        zip: '75001',
        country: 'France',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(mockPrismaCustomerCreate).toHaveBeenCalled();
  });

  it('should create customer bike when bikeBrand or bikeModel provided', async () => {
    const mockCustomer = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    mockPrismaCustomerCreate.mockResolvedValue(mockCustomer);
    mockPrismaCustomerBikeUpsert.mockResolvedValue({});

    const req = createMockRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        bikeBrand: 'Trek',
        bikeModel: 'Mountain Bike',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrismaCustomerBikeUpsert).toHaveBeenCalledWith({
      where: { customerId_index: { customerId: '1', index: 1 } },
      update: {
        brand: 'Trek',
        model: 'Mountain Bike',
        nationalFileId: null,
      },
      create: {
        customerId: '1',
        index: 1,
        brand: 'Trek',
        model: 'Mountain Bike',
        nationalFileId: null,
      },
    });
  });

  it('should handle missing fields gracefully', async () => {
    const mockCustomer = {
      id: '1',
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
    };

    mockPrismaCustomerCreate.mockResolvedValue(mockCustomer);

    const req = createMockRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: {},
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1' });
  });

  it('should return 500 on database error', async () => {
    mockPrismaCustomerCreate.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: {
        firstName: 'John',
        lastName: 'Doe',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'customer_create_failed');
  });
});

