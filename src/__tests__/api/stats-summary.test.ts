/**
 * Tests for GET /api/stats/summary
 * Tests statistics summary endpoint
 */

import { GET } from '@/app/api/stats/summary/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findMany: jest.fn(),
    },
    workOrder: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrismaInvoiceFindMany = prisma.invoice.findMany as jest.Mock;
const mockPrismaWorkOrderFindMany = prisma.workOrder.findMany as jest.Mock;

describe('GET /api/stats/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return summary statistics', async () => {
    const mockInvoices = [
      { id: 'inv-1', status: 'issued', totalTTC: 100, issueDate: new Date('2024-01-15'), createdAt: new Date('2024-01-15') },
      { id: 'inv-2', status: 'paid', totalTTC: 200, issueDate: new Date('2024-01-20'), createdAt: new Date('2024-01-20') },
      { id: 'inv-3', status: 'paid', totalTTC: 150, issueDate: new Date('2024-02-01'), createdAt: new Date('2024-02-01') },
    ];

    const mockWorkOrders = [
      { id: 'wo-1', status: 'delivered', dueAt: new Date('2024-01-18'), createdAt: new Date('2024-01-10') },
      { id: 'wo-2', status: 'delivered', dueAt: new Date('2024-02-05'), createdAt: new Date('2024-02-01') },
      { id: 'wo-3', status: 'pending', dueAt: null, createdAt: new Date('2024-01-25') },
    ];

    mockPrismaInvoiceFindMany.mockResolvedValue(mockInvoices);
    mockPrismaWorkOrderFindMany.mockResolvedValue(mockWorkOrders);

    const req = new Request('http://localhost/api/stats/summary');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('invoices');
    expect(data).toHaveProperty('workOrders');
    expect(data.invoices.totalCount).toBe(3);
    expect(data.invoices.issuedCount).toBe(1);
    expect(data.invoices.paidCount).toBe(2);
    expect(data.invoices.totalAmount).toBe(450);
  });

  it('should filter statistics by date range', async () => {
    const mockInvoices = [
      { id: 'inv-1', status: 'issued', totalTTC: 100, issueDate: new Date('2024-01-15'), createdAt: new Date('2024-01-15') },
      { id: 'inv-2', status: 'paid', totalTTC: 200, issueDate: new Date('2024-01-20'), createdAt: new Date('2024-01-20') },
      { id: 'inv-3', status: 'paid', totalTTC: 150, issueDate: new Date('2024-02-01'), createdAt: new Date('2024-02-01') },
    ];

    const mockWorkOrders = [
      { id: 'wo-1', status: 'delivered', dueAt: new Date('2024-01-18'), createdAt: new Date('2024-01-10') },
      { id: 'wo-2', status: 'delivered', dueAt: new Date('2024-02-05'), createdAt: new Date('2024-02-01') },
    ];

    mockPrismaInvoiceFindMany.mockResolvedValue(mockInvoices);
    mockPrismaWorkOrderFindMany.mockResolvedValue(mockWorkOrders);

    const req = new Request('http://localhost/api/stats/summary?from=2024-01-01&to=2024-01-31');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.invoices.range.count).toBe(2); // Only Jan invoices
    expect(data.invoices.range.totalAmount).toBe(300); // 100 + 200
    expect(data.invoices.range.paidAmount).toBe(200); // Only paid invoice in Jan
    expect(data.workOrders.deliveredInRange).toBe(1); // Only 1 WO delivered in Jan
  });

  it('should handle empty data', async () => {
    mockPrismaInvoiceFindMany.mockResolvedValue([]);
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/stats/summary');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.invoices.totalCount).toBe(0);
    expect(data.invoices.totalAmount).toBe(0);
    expect(data.workOrders.deliveredInRange).toBe(0);
  });

  it('should handle invalid date parameters', async () => {
    mockPrismaInvoiceFindMany.mockResolvedValue([]);
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/stats/summary?from=invalid&to=invalid');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.invoices.range.from).toBeNull();
    expect(data.invoices.range.to).toBeNull();
  });

  it('should use issueDate when available, fallback to createdAt', async () => {
    const mockInvoices = [
      { id: 'inv-1', status: 'paid', totalTTC: 100, issueDate: new Date('2024-01-15'), createdAt: new Date('2024-01-01') },
      { id: 'inv-2', status: 'paid', totalTTC: 200, issueDate: null, createdAt: new Date('2024-01-20') },
    ];

    mockPrismaInvoiceFindMany.mockResolvedValue(mockInvoices);
    mockPrismaWorkOrderFindMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/stats/summary?from=2024-01-10&to=2024-01-31');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.invoices.range.count).toBe(2); // Both in range
  });

  it('should filter work orders by status and date', async () => {
    const mockWorkOrders = [
      { id: 'wo-1', status: 'delivered', dueAt: new Date('2024-01-15'), createdAt: new Date('2024-01-10') },
      { id: 'wo-2', status: 'pending', dueAt: new Date('2024-01-20'), createdAt: new Date('2024-01-15') },
      { id: 'wo-3', status: 'delivered', dueAt: null, createdAt: new Date('2024-01-18') },
    ];

    mockPrismaInvoiceFindMany.mockResolvedValue([]);
    mockPrismaWorkOrderFindMany.mockResolvedValue(mockWorkOrders);

    const req = new Request('http://localhost/api/stats/summary?from=2024-01-01&to=2024-01-31');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workOrders.deliveredInRange).toBe(2); // Only delivered WOs
  });
});
