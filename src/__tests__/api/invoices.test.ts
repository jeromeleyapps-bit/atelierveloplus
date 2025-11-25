import { GET, POST } from '@/app/api/finance/invoices/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { getIsAutoEntrepreneur } from '@/lib/api-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    workOrderLine: {
      findMany: jest.fn(),
    },
    invoiceLine: {
      createMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getIsAutoEntrepreneur: jest.fn(),
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
const mockPrismaCustomerFindMany = prisma.customer.findMany as jest.Mock;
const mockPrismaWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock;
const mockPrismaWorkOrderFindMany = prisma.workOrder.findMany as jest.Mock;
const mockPrismaWorkOrderLineFindMany = prisma.workOrderLine.findMany as jest.Mock;
const mockPrismaInvoiceLineCreateMany = prisma.invoiceLine.createMany as jest.Mock;
const mockGetIsAutoEntrepreneur = getIsAutoEntrepreneur as jest.Mock;

describe('GET /api/finance/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 503 if Prisma is not available', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;

    const req = createMockRequest('http://localhost:3000/api/finance/invoices') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'database_unavailable');

    (prisma as any) = originalPrisma;
  });

  it('should return all invoices', async () => {
    const mockInvoices = [
      {
        id: '1',
        number: 'INV-001',
        customerId: 'customer-1',
        workOrderId: 'wo-1',
        status: 'issued',
        issueDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      },
    ];

    const mockCustomers = [
      { id: 'customer-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ];

    const mockWorkOrders = [
      { id: 'wo-1', customerId: 'customer-1' },
    ];

    mockPrismaInvoiceFindMany.mockResolvedValue(mockInvoices);
    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);
    mockPrismaWorkOrderFindMany.mockResolvedValue(mockWorkOrders);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty('customerName', 'John Doe');
  });

  it('should filter invoices by status', async () => {
    mockPrismaInvoiceFindMany.mockResolvedValue([]);
    mockPrismaCustomerFindMany.mockResolvedValue([]);
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices?status=issued') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaInvoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'issued' },
      })
    );
  });

  it('should filter invoices by date range', async () => {
    mockPrismaInvoiceFindMany.mockResolvedValue([]);
    mockPrismaCustomerFindMany.mockResolvedValue([]);
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices?from=2024-01-01&to=2024-12-31') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaInvoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          issueDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaInvoiceFindMany.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/finance/invoices') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});

describe('POST /api/finance/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsAutoEntrepreneur.mockResolvedValue(false);
  });

  it('should create a new invoice', async () => {
    const mockInvoice = {
      id: '1',
      workOrderId: null,
      customerId: 'customer-1',
      type: 'invoice',
      pricingMode: 'HT_TVA',
      currency: 'EUR',
      vatRate: 20,
      laborRate: 60,
      status: 'draft',
      subtotalHT: 0,
      vatAmount: 0,
      totalTTC: 0,
    };

    mockPrismaInvoiceCreate.mockResolvedValue(mockInvoice);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices', {
      method: 'POST',
      body: {
        customerId: 'customer-1',
        pricingMode: 'HT_TVA',
        currency: 'EUR',
        vatRate: 20,
        laborRate: 60,
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', customerId: 'customer-1' });
    expect(mockPrismaInvoiceCreate).toHaveBeenCalled();
  });

  it('should set vatRate to 0 for auto-entrepreneur', async () => {
    mockGetIsAutoEntrepreneur.mockResolvedValue(true);

    const mockInvoice = {
      id: '1',
      customerId: 'customer-1',
      pricingMode: 'AE_TTC',
      vatRate: 0,
      status: 'draft',
    };

    mockPrismaInvoiceCreate.mockResolvedValue(mockInvoice);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices', {
      method: 'POST',
      body: {
        customerId: 'customer-1',
        pricingMode: 'HT_TVA',
        vatRate: 20,
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

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

  it('should copy workOrder lines to invoice when workOrderId provided', async () => {
    const mockInvoice = {
      id: '1',
      workOrderId: 'wo-1',
      customerId: 'customer-1',
      status: 'draft',
      subtotalHT: 0,
      vatAmount: 0,
      totalTTC: 0,
    };

    const mockWorkOrder = {
      id: 'wo-1',
      customerId: 'customer-1',
    };

    const mockWorkOrderLines = [
      {
        id: 'line-1',
        workOrderId: 'wo-1',
        type: 'labor',
        description: 'Reparation',
        quantity: 1,
        priceHT: 60,
        vatRate: 20,
        sourceId: null,
      },
    ];

    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);
    mockPrismaInvoiceCreate.mockResolvedValue(mockInvoice);
    mockPrismaWorkOrderLineFindMany.mockResolvedValue(mockWorkOrderLines);
    mockPrismaInvoiceLineCreateMany.mockResolvedValue({});
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices', {
      method: 'POST',
      body: {
        workOrderId: 'wo-1',
        pricingMode: 'HT_TVA',
        vatRate: 20,
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(mockPrismaWorkOrderLineFindMany).toHaveBeenCalledWith({
      where: { workOrderId: 'wo-1' },
    });
    expect(mockPrismaInvoiceLineCreateMany).toHaveBeenCalled();
    expect(mockPrismaInvoiceUpdate).toHaveBeenCalled();
  });

  it('should get customerId from workOrder if not provided', async () => {
    const mockInvoice = {
      id: '1',
      workOrderId: 'wo-1',
      customerId: 'customer-1',
      status: 'draft',
    };

    const mockWorkOrder = {
      id: 'wo-1',
      customerId: 'customer-1',
    };

    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);
    mockPrismaInvoiceCreate.mockResolvedValue(mockInvoice);
    mockPrismaWorkOrderLineFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices', {
      method: 'POST',
      body: {
        workOrderId: 'wo-1',
      },
    }) as any;

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockPrismaInvoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'customer-1',
        }),
      })
    );
  });

  it('should handle database errors', async () => {
    mockPrismaInvoiceCreate.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/finance/invoices', {
      method: 'POST',
      body: {
        customerId: 'customer-1',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});

