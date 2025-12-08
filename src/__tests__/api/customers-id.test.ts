import { GET, PATCH } from '@/app/api/customers/[id]/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

const mockPrismaCustomerFindUnique = prisma.customer.findUnique as jest.Mock;
const mockPrismaCustomerUpdate = prisma.customer.update as jest.Mock;
const mockPrismaCustomerBikeUpsert = prisma.customerBike.upsert as jest.Mock;

describe('GET /api/customers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return customer by id', async () => {
    const mockCustomer = {
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    mockPrismaCustomerFindUnique.mockResolvedValue(mockCustomer);

    const req = createMockRequest('http://localhost:3000/api/customers/customer-1') as any;
    const params = Promise.resolve({ id: 'customer-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('should return 404 if customer not found', async () => {
    mockPrismaCustomerFindUnique.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/customers/non-existent') as any;
    const params = Promise.resolve({ id: 'non-existent' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'not_found');
  });
});

describe('PATCH /api/customers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update customer', async () => {
    const mockUpdatedCustomer = {
      id: 'customer-1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    };

    mockPrismaCustomerUpdate.mockResolvedValue(mockUpdatedCustomer);
    mockPrismaCustomerBikeUpsert.mockResolvedValue({});

    const req = createMockRequest('http://localhost:3000/api/customers/customer-1', {
      method: 'PATCH',
      body: {
        firstName: 'Jane',
        lastName: 'Smith',
      },
    }) as any;

    const params = Promise.resolve({ id: 'customer-1' });
    const res = await PATCH(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      id: 'customer-1',
      firstName: 'Jane',
      lastName: 'Smith',
    });
    expect(mockPrismaCustomerUpdate).toHaveBeenCalled();
  });

  it('should update customer bike when bikeBrand provided', async () => {
    const mockCustomer = {
      id: 'customer-1',
      firstName: 'John',
      bikeBrand: 'Trek',
    };

    mockPrismaCustomerUpdate.mockResolvedValue(mockCustomer);
    mockPrismaCustomerBikeUpsert.mockResolvedValue({});

    const req = createMockRequest('http://localhost:3000/api/customers/customer-1', {
      method: 'PATCH',
      body: {
        bikeBrand: 'Trek',
        bikeModel: 'Mountain',
      },
    }) as any;

    const params = Promise.resolve({ id: 'customer-1' });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(200);
    expect(mockPrismaCustomerBikeUpsert).toHaveBeenCalled();
  });

  it('should handle null values', async () => {
    const mockCustomer = {
      id: 'customer-1',
      firstName: null,
      lastName: null,
    };

    mockPrismaCustomerUpdate.mockResolvedValue(mockCustomer);

    const req = createMockRequest('http://localhost:3000/api/customers/customer-1', {
      method: 'PATCH',
      body: {
        firstName: null,
        lastName: null,
      },
    }) as any;

    const params = Promise.resolve({ id: 'customer-1' });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(200);
  });

  it('should handle invalid JSON gracefully', async () => {
    const req = {
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as any;

    const params = Promise.resolve({ id: 'customer-1' });
    const res = await PATCH(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200); // Empty body is handled as {}
  });

  it('should handle database errors', async () => {
    mockPrismaCustomerUpdate.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/customers/customer-1', {
      method: 'PATCH',
      body: {
        firstName: 'John',
      },
    }) as any;

    const params = Promise.resolve({ id: 'customer-1' });
    const res = await PATCH(req, { params });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'customer_update_failed');
  });
});
