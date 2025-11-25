import { GET, POST } from '@/app/api/finance/quotes/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { getIsAutoEntrepreneur } from '@/lib/api-helpers';
import { calculateLaborCost } from '@/lib/labor-pricing';
import { recomputeTotals } from '@/lib/invoice-totals';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
    },
    workOrderLine: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getIsAutoEntrepreneur: jest.fn(),
}));

jest.mock('@/lib/labor-pricing', () => ({
  calculateLaborCost: jest.fn(),
}));

jest.mock('@/lib/invoice-totals', () => ({
  recomputeTotals: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaInvoiceFindMany = prisma.invoice.findMany as jest.Mock;
const mockPrismaInvoiceCreate = prisma.invoice.create as jest.Mock;
const mockPrismaInvoiceUpdate = prisma.invoice.update as jest.Mock;
const mockPrismaInvoiceFindUnique = prisma.invoice.findUnique as jest.Mock;
const mockPrismaWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock;
const mockPrismaWorkOrderLineFindMany = prisma.workOrderLine.findMany as jest.Mock;
const mockGetIsAutoEntrepreneur = getIsAutoEntrepreneur as jest.Mock;
const mockCalculateLaborCost = calculateLaborCost as jest.Mock;
const mockRecomputeTotals = recomputeTotals as jest.Mock;

describe('GET /api/finance/quotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 503 if Prisma is not available', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;

    const req = createMockRequest('http://localhost:3000/api/finance/quotes') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'Database unavailable');

    (prisma as any) = originalPrisma;
  });

  it('should return all quotes', async () => {
    const mockQuotes = [
      {
        id: 'quote-1',
        type: 'quote',
        status: 'draft',
        InvoiceLine: [],
      },
    ];

    mockPrismaInvoiceFindMany.mockResolvedValue(mockQuotes);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: 'quote-1', type: 'quote' });
  });

  it('should filter quotes by status', async () => {
    mockPrismaInvoiceFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes?status=draft') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaInvoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'quote',
          status: 'draft',
        }),
      })
    );
  });

  it('should filter quotes by workOrderId', async () => {
    mockPrismaInvoiceFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes?workOrderId=wo-1') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaInvoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workOrderId: 'wo-1',
        }),
      })
    );
  });
});

describe('POST /api/finance/quotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsAutoEntrepreneur.mockResolvedValue(false);
    mockCalculateLaborCost.mockResolvedValue({ hourlyRate: 60, laborCostHT: 30 });
    mockRecomputeTotals.mockReturnValue({
      subtotalHT: 100,
      vatAmount: 20,
      totalTTC: 120,
    });
  });

  it('should return 503 if Prisma is not available', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;

    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: { workOrderId: 'wo-1' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'Database unavailable');

    (prisma as any) = originalPrisma;
  });

  it('should return 400 if workOrderId is missing', async () => {
    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: {},
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'workOrderId is required');
  });

  it('should return 404 if work order not found', async () => {
    mockPrismaWorkOrderFindUnique.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: { workOrderId: 'non-existent' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'Work order not found');
  });

  it('should create quote from work order', async () => {
    const mockWorkOrder = {
      id: 'wo-1',
      estimatedMinutes: 60,
      hourlyRate: 60,
    };

    const mockQuote = {
      id: 'quote-1',
      type: 'quote',
      status: 'draft',
      workOrderId: 'wo-1',
      InvoiceLine: [],
    };

    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);
    mockPrismaWorkOrderLineFindMany.mockResolvedValue([]);
    mockPrismaInvoiceCreate.mockResolvedValue(mockQuote);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: { workOrderId: 'wo-1' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: 'quote-1', type: 'quote' });
    expect(mockPrismaInvoiceCreate).toHaveBeenCalled();
  });

  it('should set vatRate to 0 for auto-entrepreneur', async () => {
    mockGetIsAutoEntrepreneur.mockResolvedValue(true);

    const mockWorkOrder = {
      id: 'wo-1',
      estimatedMinutes: 60,
      hourlyRate: 60,
    };

    const mockQuote = {
      id: 'quote-1',
      type: 'quote',
      pricingMode: 'AE_TTC',
      vatRate: 0,
      InvoiceLine: [],
    };

    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);
    mockPrismaWorkOrderLineFindMany.mockResolvedValue([]);
    mockPrismaInvoiceCreate.mockResolvedValue(mockQuote);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: { workOrderId: 'wo-1' },
    }) as any;

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPrismaInvoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pricingMode: 'AE_TTC',
          vatRate: 0,
        }),
      })
    );
  });

  it('should copy work order lines to quote', async () => {
    const mockWorkOrder = {
      id: 'wo-1',
      estimatedMinutes: 0,
      hourlyRate: null,
    };

    const mockWorkOrderLines = [
      {
        id: 'line-1',
        type: 'part',
        description: 'Part 1',
        quantity: 2,
        priceHT: 50,
        vatRate: 20,
      },
    ];

    const mockQuote = {
      id: 'quote-1',
      InvoiceLine: [],
    };

    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);
    mockPrismaWorkOrderLineFindMany.mockResolvedValue(mockWorkOrderLines);
    mockPrismaInvoiceCreate.mockResolvedValue(mockQuote);
    mockPrismaInvoiceFindUnique.mockResolvedValue(mockQuote);

    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: { workOrderId: 'wo-1' },
    }) as any;

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPrismaInvoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          InvoiceLine: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                type: 'part',
                description: 'Part 1',
              }),
            ]),
          }),
        }),
      })
    );
  });

  it('should handle database errors', async () => {
    mockPrismaWorkOrderFindUnique.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/finance/quotes', {
      method: 'POST',
      body: { workOrderId: 'wo-1' },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to create quote');
  });
});
