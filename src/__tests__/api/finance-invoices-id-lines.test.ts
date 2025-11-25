/**
 * Tests for POST /api/finance/invoices/[id]/lines
 * Tests creation of invoice lines
 */

import { POST } from '@/app/api/finance/invoices/[id]/lines/route';
import { prisma } from '@/lib/prisma';
import { getIsAutoEntrepreneur } from '@/lib/api-helpers';
import { recomputeTotals } from '@/lib/invoice-totals';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoiceLine: {
      create: jest.fn(),
    },
    catalogItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getIsAutoEntrepreneur: jest.fn(),
}));

jest.mock('@/lib/invoice-totals', () => ({
  recomputeTotals: jest.fn(),
}));

const mockPrismaInvoiceFindUnique = prisma.invoice.findUnique as jest.Mock;
const mockPrismaInvoiceUpdate = prisma.invoice.update as jest.Mock;
const mockPrismaInvoiceLineCreate = prisma.invoiceLine.create as jest.Mock;
const mockPrismaCatalogItemFindUnique = prisma.catalogItem.findUnique as jest.Mock;
const mockPrismaCatalogItemUpdate = prisma.catalogItem.update as jest.Mock;
const mockGetIsAutoEntrepreneur = getIsAutoEntrepreneur as jest.Mock;
const mockRecomputeTotals = recomputeTotals as jest.Mock;

describe('POST /api/finance/invoices/[id]/lines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockGetIsAutoEntrepreneur.mockResolvedValue(false);
    mockRecomputeTotals.mockReturnValue({
      totalHT: 100,
      totalTTC: 120,
      totalVAT: 20,
    });
  });

  it('should create an invoice line successfully', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      vatRate: 20,
      pricingMode: 'HT',
      discountAmount: 0,
      InvoiceLine: [],
    };

    const mockLine = {
      id: 'line-1',
      invoiceId: 'invoice-1',
      type: 'part',
      description: 'Test part',
      qty: 2,
      unitPriceHT: 50,
      unitPriceTTC: 60,
      vatRate: 20,
      totalHT: 100,
      totalTTC: 120,
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);
    mockPrismaInvoiceLineCreate.mockResolvedValue(mockLine);
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = new Request('http://localhost/api/finance/invoices/invoice-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'Test part',
        quantity: 2,
        priceHT: 50,
        vatRate: 20,
      }),
    });

    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await POST(req, { params });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({
      id: 'line-1',
      type: 'part',
      description: 'Test part',
    });
    expect(mockPrismaInvoiceLineCreate).toHaveBeenCalled();
  });

  it('should return 404 if invoice not found', async () => {
    mockPrismaInvoiceFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/finance/invoices/invoice-999/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'Test part',
        quantity: 1,
        priceHT: 50,
      }),
    });

    const params = Promise.resolve({ id: 'invoice-999' });
    const res = await POST(req, { params });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'not_found');
  });

  it('should set vatRate to 0 for auto-entrepreneur', async () => {
    mockGetIsAutoEntrepreneur.mockResolvedValue(true);

    const mockInvoice = {
      id: 'invoice-1',
      vatRate: 20,
      pricingMode: 'HT',
      discountAmount: 0,
      InvoiceLine: [],
    };

    const mockLine = {
      id: 'line-1',
      invoiceId: 'invoice-1',
      type: 'service',
      description: 'Test service',
      qty: 1,
      unitPriceHT: 100,
      unitPriceTTC: 100, // Same as HT because vatRate = 0
      vatRate: 0,
      totalHT: 100,
      totalTTC: 100,
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);
    mockPrismaInvoiceLineCreate.mockResolvedValue(mockLine);
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = new Request('http://localhost/api/finance/invoices/invoice-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'service',
        description: 'Test service',
        quantity: 1,
        priceHT: 100,
        vatRate: 20, // Should be overridden to 0
      }),
    });

    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await POST(req, { params });

    expect(res.status).toBe(201);
    expect(mockPrismaInvoiceLineCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vatRate: 0,
        }),
      })
    );
  });

  it('should calculate totals correctly', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      vatRate: 20,
      pricingMode: 'HT',
      discountAmount: 0,
      InvoiceLine: [],
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);
    mockPrismaInvoiceLineCreate.mockResolvedValue({
      id: 'line-1',
      invoiceId: 'invoice-1',
      type: 'part',
      description: 'Test',
      qty: 3,
      unitPriceHT: 25,
      unitPriceTTC: 30,
      vatRate: 20,
      totalHT: 75,
      totalTTC: 90,
    });
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = new Request('http://localhost/api/finance/invoices/invoice-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'Test',
        quantity: 3,
        priceHT: 25,
        vatRate: 20,
      }),
    });

    const params = Promise.resolve({ id: 'invoice-1' });
    await POST(req, { params });

    expect(mockPrismaInvoiceLineCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qty: 3,
          unitPriceHT: 25,
          totalHT: 75,
        }),
      })
    );
  });

  it('should decrement stock for parts with sourceId', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      vatRate: 20,
      pricingMode: 'HT',
      discountAmount: 0,
      InvoiceLine: [],
    };

    const mockCatalogItem = {
      id: 'catalog-1',
      name: 'Test Part',
      stockQty: 10,
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);
    mockPrismaInvoiceLineCreate.mockResolvedValue({
      id: 'line-1',
      invoiceId: 'invoice-1',
      type: 'part',
      description: 'Test Part',
      qty: 2,
      unitPriceHT: 50,
      unitPriceTTC: 60,
      vatRate: 20,
      totalHT: 100,
      totalTTC: 120,
    });
    mockPrismaCatalogItemFindUnique.mockResolvedValue(mockCatalogItem);
    mockPrismaCatalogItemUpdate.mockResolvedValue({ ...mockCatalogItem, stockQty: 8 });
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = new Request('http://localhost/api/finance/invoices/invoice-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'Test Part',
        quantity: 2,
        priceHT: 50,
        sourceId: 'catalog-1',
      }),
    });

    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await POST(req, { params });

    expect(res.status).toBe(201);
    expect(mockPrismaCatalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'catalog-1' },
      data: { stockQty: 8 },
    });
  });

  it('should support legacy field names (qty, unitPriceHT)', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      vatRate: 20,
      pricingMode: 'HT',
      discountAmount: 0,
      InvoiceLine: [],
    };

    mockPrismaInvoiceFindUnique.mockResolvedValue(mockInvoice);
    mockPrismaInvoiceLineCreate.mockResolvedValue({
      id: 'line-1',
      invoiceId: 'invoice-1',
      type: 'part',
      description: 'Test',
      qty: 2,
      unitPriceHT: 50,
      unitPriceTTC: 60,
      vatRate: 20,
      totalHT: 100,
      totalTTC: 120,
    });
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = new Request('http://localhost/api/finance/invoices/invoice-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'Test',
        qty: 2, // Legacy field
        unitPriceHT: 50, // Legacy field
      }),
    });

    const params = Promise.resolve({ id: 'invoice-1' });
    const res = await POST(req, { params });

    expect(res.status).toBe(201);
    expect(mockPrismaInvoiceLineCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qty: 2,
          unitPriceHT: 50,
        }),
      })
    );
  });

  it('should recompute invoice totals after adding line', async () => {
    const mockInvoice = {
      id: 'invoice-1',
      vatRate: 20,
      pricingMode: 'HT',
      discountAmount: 10,
      InvoiceLine: [
        {
          id: 'existing-line',
          type: 'part',
          qty: 1,
          unitPriceHT: 50,
          unitPriceTTC: 60,
          vatRate: 20,
        },
      ],
    };

    mockPrismaInvoiceFindUnique
      .mockResolvedValueOnce(mockInvoice) // First call
      .mockResolvedValueOnce({ ...mockInvoice, InvoiceLine: [...mockInvoice.InvoiceLine, { id: 'line-1', type: 'part', qty: 2, unitPriceHT: 25, unitPriceTTC: 30, vatRate: 20 }] }); // Second call (fresh)
    
    mockPrismaInvoiceLineCreate.mockResolvedValue({
      id: 'line-1',
      invoiceId: 'invoice-1',
      type: 'part',
      description: 'New line',
      qty: 2,
      unitPriceHT: 25,
      unitPriceTTC: 30,
      vatRate: 20,
      totalHT: 50,
      totalTTC: 60,
    });
    mockPrismaInvoiceUpdate.mockResolvedValue(mockInvoice);

    const req = new Request('http://localhost/api/finance/invoices/invoice-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'New line',
        quantity: 2,
        priceHT: 25,
      }),
    });

    const params = Promise.resolve({ id: 'invoice-1' });
    await POST(req, { params });

    expect(mockRecomputeTotals).toHaveBeenCalled();
    expect(mockPrismaInvoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        totalHT: 100,
        totalTTC: 120,
      }),
    });
  });
});

