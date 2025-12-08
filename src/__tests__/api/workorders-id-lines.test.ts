/**
 * Tests for GET/POST /api/workorders/[id]/lines
 * Tests fetching and creation of work order lines
 */

import { GET, POST } from '@/app/api/workorders/[id]/lines/route';
import { prisma } from '@/lib/prisma';
import { getIsAutoEntrepreneur } from '@/lib/api-helpers';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workOrderLine: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getIsAutoEntrepreneur: jest.fn(),
}));

const mockPrismaWorkOrderLineFindMany = prisma.workOrderLine.findMany as jest.Mock;
const mockPrismaWorkOrderLineCreate = prisma.workOrderLine.create as jest.Mock;
const mockGetIsAutoEntrepreneur = getIsAutoEntrepreneur as jest.Mock;

describe('GET /api/workorders/[id]/lines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsAutoEntrepreneur.mockResolvedValue(false);
  });

  it('should fetch work order lines successfully', async () => {
    const mockLines = [
      {
        id: 'line-1',
        workOrderId: 'wo-1',
        type: 'service',
        description: 'Réparation',
        quantity: 1,
        priceHT: 50,
        vatRate: 20,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'line-2',
        workOrderId: 'wo-1',
        type: 'part',
        description: 'Pièce',
        quantity: 2,
        priceHT: 25,
        vatRate: 20,
        createdAt: new Date('2024-01-02'),
      },
    ];

    mockPrismaWorkOrderLineFindMany.mockResolvedValue(mockLines);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines');
    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('lines');
    expect(data.lines).toHaveLength(2);
    expect(mockPrismaWorkOrderLineFindMany).toHaveBeenCalledWith({
      where: { workOrderId: 'wo-1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('should return empty array if no lines found', async () => {
    mockPrismaWorkOrderLineFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/workorders/wo-999/lines');
    const context = { params: Promise.resolve({ id: 'wo-999' }) };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines).toEqual([]);
  });

  it('should force vatRate to 0 for auto-entrepreneur', async () => {
    mockGetIsAutoEntrepreneur.mockResolvedValue(true);

    const mockLines = [
      {
        id: 'line-1',
        workOrderId: 'wo-1',
        type: 'service',
        description: 'Service',
        quantity: 1,
        priceHT: 100,
        vatRate: 20, // Should be forced to 0
        createdAt: new Date('2024-01-01'),
      },
    ];

    mockPrismaWorkOrderLineFindMany.mockResolvedValue(mockLines);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines');
    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lines[0].vatRate).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaWorkOrderLineFindMany.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines');
    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});

describe('POST /api/workorders/[id]/lines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIsAutoEntrepreneur.mockResolvedValue(false);
  });

  it('should create a work order line successfully', async () => {
    const mockLine = {
      id: 'line-1',
      workOrderId: 'wo-1',
      type: 'service',
      description: 'Réparation',
      quantity: 1,
      priceHT: 50,
      vatRate: 20,
      duration: null,
      sourceId: null,
      notes: null,
    };

    mockPrismaWorkOrderLineCreate.mockResolvedValue(mockLine);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'service',
        description: 'Réparation',
        quantity: 1,
        priceHT: 50,
        vatRate: 20,
      }),
    });

    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await POST(req, context);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({
      id: 'line-1',
      type: 'service',
      description: 'Réparation',
    });
    expect(mockPrismaWorkOrderLineCreate).toHaveBeenCalled();
  });

  it('should set vatRate to 0 for auto-entrepreneur', async () => {
    mockGetIsAutoEntrepreneur.mockResolvedValue(true);

    const mockLine = {
      id: 'line-1',
      workOrderId: 'wo-1',
      type: 'service',
      description: 'Service',
      quantity: 1,
      priceHT: 100,
      vatRate: 0,
      duration: null,
      sourceId: null,
      notes: null,
    };

    mockPrismaWorkOrderLineCreate.mockResolvedValue(mockLine);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'service',
        description: 'Service',
        quantity: 1,
        priceHT: 100,
        vatRate: 20, // Should be overridden to 0
      }),
    });

    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await POST(req, context);

    expect(res.status).toBe(201);
    expect(mockPrismaWorkOrderLineCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vatRate: 0,
      }),
    });
  });

  it('should parse numeric values correctly', async () => {
    const mockLine = {
      id: 'line-1',
      workOrderId: 'wo-1',
      type: 'part',
      description: 'Pièce',
      quantity: 3,
      priceHT: 25.5,
      vatRate: 20,
      duration: 30,
      sourceId: 'catalog-1',
      notes: 'Test notes',
    };

    mockPrismaWorkOrderLineCreate.mockResolvedValue(mockLine);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'part',
        description: 'Pièce',
        quantity: '3', // String
        priceHT: '25.5', // String
        vatRate: '20', // String
        duration: '30', // String
        sourceId: 'catalog-1',
        notes: 'Test notes',
      }),
    });

    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await POST(req, context);

    expect(res.status).toBe(201);
    expect(mockPrismaWorkOrderLineCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quantity: 3,
        priceHT: 25.5,
        vatRate: 20,
        duration: 30,
      }),
    });
  });

  it('should use default values for missing fields', async () => {
    const mockLine = {
      id: 'line-1',
      workOrderId: 'wo-1',
      type: 'manual',
      description: 'Manual entry',
      quantity: 1,
      priceHT: 0,
      vatRate: 0,
      duration: null,
      sourceId: null,
      notes: null,
    };

    mockPrismaWorkOrderLineCreate.mockResolvedValue(mockLine);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'manual',
        description: 'Manual entry',
        // Missing: quantity, priceHT, vatRate, duration, sourceId, notes
      }),
    });

    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await POST(req, context);

    expect(res.status).toBe(201);
    expect(mockPrismaWorkOrderLineCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quantity: 1,
        priceHT: 0,
        vatRate: 0,
        duration: null,
        sourceId: null,
        notes: null,
      }),
    });
  });

  it('should handle different line types (service, part, manual)', async () => {
    const types = ['service', 'part', 'manual'];

    for (const type of types) {
      jest.clearAllMocks();

      const mockLine = {
        id: `line-${type}`,
        workOrderId: 'wo-1',
        type,
        description: `Test ${type}`,
        quantity: 1,
        priceHT: 50,
        vatRate: 20,
        duration: null,
        sourceId: null,
        notes: null,
      };

      mockPrismaWorkOrderLineCreate.mockResolvedValue(mockLine);

      const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: `Test ${type}`,
          quantity: 1,
          priceHT: 50,
          vatRate: 20,
        }),
      });

      const context = { params: Promise.resolve({ id: 'wo-1' }) };
      const res = await POST(req, context);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.type).toBe(type);
    }
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaWorkOrderLineCreate.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'service',
        description: 'Test',
        quantity: 1,
        priceHT: 50,
      }),
    });

    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await POST(req, context);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  it('should include optional fields when provided', async () => {
    const mockLine = {
      id: 'line-1',
      workOrderId: 'wo-1',
      type: 'service',
      description: 'Service with duration',
      quantity: 1,
      priceHT: 50,
      vatRate: 20,
      duration: 60,
      sourceId: 'service-rate-1',
      notes: 'Important notes',
    };

    mockPrismaWorkOrderLineCreate.mockResolvedValue(mockLine);

    const req = new NextRequest('http://localhost/api/workorders/wo-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'service',
        description: 'Service with duration',
        quantity: 1,
        priceHT: 50,
        vatRate: 20,
        duration: 60,
        sourceId: 'service-rate-1',
        notes: 'Important notes',
      }),
    });

    const context = { params: Promise.resolve({ id: 'wo-1' }) };
    const res = await POST(req, context);

    expect(res.status).toBe(201);
    expect(mockPrismaWorkOrderLineCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        duration: 60,
        sourceId: 'service-rate-1',
        notes: 'Important notes',
      }),
    });
  });
});

