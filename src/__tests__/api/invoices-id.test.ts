import { GET } from '@/app/api/finance/invoices/[id]/route';
import { prisma } from '@/lib/prisma';
import { getIsAutoEntrepreneur } from '@/lib/api-helpers';
import { createMockRequest } from '../helpers/test-request';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
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

const mockPrismaInvoiceFindUnique = prisma.invoice.findUnique as jest.Mock;
const mockPrismaWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock;
const mockGetIsAutoEntrepreneur = getIsAutoEntrepreneur as jest.Mock;

describe('GET /api/finance/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsAutoEntrepreneur.mockResolvedValue(false);
  });

  it('should return invoice by id', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      number: 'INV-001',
      subtotalHT: 100,
      vatAmount: 20,
      totalTTC: 120,
      InvoiceLine: [],
      InvoicePayment: [],
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices/invoice-1') as any;
    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('id', 'invoice-1');
    expect(data).toHaveProperty('number', 'INV-001');
  });

  it('should return 404 if invoice not found', async () => {
    mockPrismaInvoiceFindUnique.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices/non-existent') as any;
    const params = Promise.resolve({ id: 'non-existent' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'not_found');
  });

  it('should set vatRate to 0 for auto-entrepreneur', async () => {
    mockGetIsAutoEntrepreneur.mockResolvedValue(true);

    const mockInvoice = {
      id: 'invoice-1',
      subtotalHT: 100,
      vatAmount: 20,
      totalTTC: 120,
      InvoiceLine: [
        { id: 'line-1', vatRate: 20, totalHT: 100 },
      ],
      InvoicePayment: [],
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices/invoice-1') as any;
    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.vatAmount).toBe(0);
    expect(data.totalTTC).toBe(100);
    if (data.lines && data.lines.length > 0) {
      expect(data.lines[0].vatRate).toBe(0);
    }
  });

  it('should include workOrder and customer if workOrderId exists', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      workOrderId: 'wo-1',
      InvoiceLine: [],
      InvoicePayment: [],
    };

    const mockWorkOrder = {
      id: 'wo-1',
      Customer: {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);
    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);

    const req = createMockRequest('http://localhost:3000/api/finance/invoices/invoice-1') as any;
    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaWorkOrderFindUnique).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      include: { Customer: true },
    });
  });

  it('should handle database errors', async () => {
    mockPrismaInvoiceFindUnique.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/finance/invoices/invoice-1') as any;
    const params = Promise.resolve({ id: 'invoice-1' });

    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});

