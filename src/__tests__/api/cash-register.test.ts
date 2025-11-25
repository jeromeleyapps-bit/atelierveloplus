import { GET, POST } from '@/app/api/cash-register/route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cashRegister: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
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

const mockPrismaCashRegisterFindMany = prisma.cashRegister.findMany as jest.Mock;
const mockPrismaCashRegisterCreate = prisma.cashRegister.create as jest.Mock;
const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;

describe('GET /api/cash-register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all cash register entries', async () => {
    const mockEntries = [
      {
        id: '1',
        type: 'income',
        amount: 100,
        createdAt: new Date(),
        Invoice: { number: 'INV-001', totalTTC: 100 },
        User: { name: 'User 1', email: 'user1@example.com' },
      },
    ];

    mockPrismaCashRegisterFindMany.mockResolvedValue(mockEntries);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: '1', type: 'income' });
  });

  it('should handle empty entries', async () => {
    mockPrismaCashRegisterFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });
});

describe('POST /api/cash-register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 if no user found', async () => {
    mockPrismaUserFindFirst.mockResolvedValue(null);

    const req = {
      json: () => Promise.resolve({ type: 'income', amount: 100 }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'no_user_found');
  });

  it('should create cash register entry', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' };
    const mockEntry = {
      id: '1',
      type: 'income',
      amount: 100,
      description: 'Test entry',
      userId: 'user-1',
      Invoice: null,
      User: mockUser,
    };

    mockPrismaUserFindFirst.mockResolvedValue(mockUser);
    mockPrismaCashRegisterCreate.mockResolvedValue(mockEntry);

    const req = {
      json: () => Promise.resolve({
        type: 'income',
        amount: 100,
        description: 'Test entry',
      }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', type: 'income', amount: 100 });
    expect(mockPrismaCashRegisterCreate).toHaveBeenCalled();
  });

  it('should return 400 if type is missing', async () => {
    const mockUser = { id: 'user-1' };
    mockPrismaUserFindFirst.mockResolvedValue(mockUser);

    const req = {
      json: () => Promise.resolve({ amount: 100 }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'missing_fields');
  });

  it('should return 400 if amount is missing', async () => {
    const mockUser = { id: 'user-1' };
    mockPrismaUserFindFirst.mockResolvedValue(mockUser);

    const req = {
      json: () => Promise.resolve({ type: 'income' }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'missing_fields');
  });

  it('should handle invoiceId', async () => {
    const mockUser = { id: 'user-1' };
    const mockEntry = {
      id: '1',
      type: 'income',
      amount: 100,
      invoiceId: 'invoice-1',
      userId: 'user-1',
      Invoice: { number: 'INV-001' },
      User: mockUser,
    };

    mockPrismaUserFindFirst.mockResolvedValue(mockUser);
    mockPrismaCashRegisterCreate.mockResolvedValue(mockEntry);

    const req = {
      json: () => Promise.resolve({
        type: 'income',
        amount: 100,
        invoiceId: 'invoice-1',
      }),
    } as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toHaveProperty('invoiceId', 'invoice-1');
  });
});

