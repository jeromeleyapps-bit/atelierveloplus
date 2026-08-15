import { GET, POST } from '@/app/api/workshop/workorders/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { rateLimit } from '@/lib/security';

// Le client est exposé par un accesseur : la route relit la valeur à chaque appel,
// ce qui permet de simuler une base indisponible. Réassigner l'import directement
// n'est plus possible avec le transpileur actuel.
const mockClientPrisma: { valeur: unknown } = {
  valeur: {
    workOrder: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
};

jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockClientPrisma.valeur;
  },
}));

jest.mock('@/lib/security', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/validation', () => ({
  CreateWorkOrderSchema: {
    parse: jest.fn(),
  },
  formatZodError: jest.fn((error) => error.errors || []),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaWorkOrderFindMany = prisma.workOrder.findMany as jest.Mock;
const mockPrismaWorkOrderCreate = prisma.workOrder.create as jest.Mock;
const mockRateLimit = rateLimit as jest.Mock;
const { CreateWorkOrderSchema } = require('@/lib/validation');

describe('GET /api/workshop/workorders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 503 if Prisma is not available', async () => {
    const original = mockClientPrisma.valeur;
    mockClientPrisma.valeur = null;

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'database_unavailable');

    mockClientPrisma.valeur = original;
  });

  it('should return 401 if user is not authenticated', async () => {
    const req = createMockRequest('http://localhost:3000/api/workshop/workorders') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should return all workorders when authenticated', async () => {
    const mockWorkOrders = [
      {
        id: '1',
        status: 'pending',
        customerId: 'customer-1',
        Customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe' },
        CustomerBike: { id: 'bike-1', brand: 'Trek', model: 'Mountain' },
      },
    ];

    mockPrismaWorkOrderFindMany.mockResolvedValue(mockWorkOrders);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: '1', status: 'pending' });
    expect(mockPrismaWorkOrderFindMany).toHaveBeenCalled();
  });

  it('should filter workorders by status', async () => {
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders?status=pending', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaWorkOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'pending' },
      })
    );
  });

  it('should filter workorders by query', async () => {
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders?q=john', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaWorkOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ Customer: expect.objectContaining({ firstName: expect.anything() }) }),
          ]),
        }),
      })
    );
  });
});

describe('POST /api/workshop/workorders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true });
  });

  it('should return 429 if rate limit exceeded', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, retryAfter: 60 });

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: { customerId: 'customer-1' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data).toHaveProperty('error', 'too_many_requests');
  });

  it('should return 401 if user is not authenticated', async () => {
    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      method: 'POST',
      body: { customerId: 'customer-1' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should create a workorder with valid data', async () => {
    const mockWorkOrder = {
      id: '1',
      status: 'created',
      customerId: 'customer-1',
      bikeId: null,
      type: null,
      Customer: null,
      CustomerBike: null,
    };

    CreateWorkOrderSchema.parse.mockReturnValue({
      status: 'created',
      customerId: 'customer-1',
    });
    mockPrismaWorkOrderCreate.mockResolvedValue(mockWorkOrder);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: {
        customerId: 'customer-1',
        status: 'created',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', customerId: 'customer-1' });
    expect(mockPrismaWorkOrderCreate).toHaveBeenCalled();
  });

  it('should return 400 for invalid input', async () => {
    const zodError = {
      name: 'ZodError',
      errors: [{ path: ['customerId'], message: 'Required' }],
    };
    CreateWorkOrderSchema.parse.mockImplementation(() => {
      throw zodError;
    });

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: {},
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'invalid_input');
    expect(data).toHaveProperty('details');
  });

  it('should handle database errors', async () => {
    CreateWorkOrderSchema.parse.mockReturnValue({ customerId: 'customer-1' });
    mockPrismaWorkOrderCreate.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders', {
      method: 'POST',
      headers: { 'x-user-id': 'user-123' },
      body: { customerId: 'customer-1' },
    }) as any;

    await expect(POST(req)).rejects.toThrow('Database error');
  });
});

