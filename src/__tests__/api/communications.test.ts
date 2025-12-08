/**
 * Tests for GET /api/communications and POST /api/communications/send
 * Tests communication listing and sending
 */

import { GET } from '@/app/api/communications/route';
import { POST } from '@/app/api/communications/send/route';
import { prisma } from '@/lib/prisma';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email-with-db-config';
import { canSendEmail, incrementEmailCount } from '@/lib/license-manager';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    communication: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    workOrder: {
      findUnique: jest.fn(),
    },
    appSetting: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    emailTemplate: {
      findFirst: jest.fn(),
    },
    sMSTemplate: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getUserIdOrFirst: jest.fn(),
}));

jest.mock('@/lib/email-with-db-config', () => ({
  sendEmail: jest.fn(),
  determineEmailProvider: jest.fn(),
}));

jest.mock('@/lib/license-manager', () => ({
  canSendEmail: jest.fn(),
  incrementEmailCount: jest.fn(),
}));

jest.mock('@/lib/template-engine', () => ({
  replaceVariables: jest.fn((template: string) => template),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockGetUserIdOrFirst = getUserIdOrFirst as jest.Mock;
const mockPrismaCommunicationFindMany = prisma.communication.findMany as jest.Mock;
const mockPrismaCommunicationCreate = prisma.communication.create as jest.Mock;
const mockPrismaCustomerFindUnique = prisma.customer.findUnique as jest.Mock;
const mockPrismaWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock;
const mockPrismaAppSettingFindUnique = prisma.appSetting.findUnique as jest.Mock;
const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockPrismaEmailTemplateFindFirst = prisma.emailTemplate.findFirst as jest.Mock;
const mockSendEmail = sendEmail as jest.Mock;
const mockCanSendEmail = canSendEmail as jest.Mock;
const mockIncrementEmailCount = incrementEmailCount as jest.Mock;

describe('GET /api/communications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserIdOrFirst.mockResolvedValue('user-123');
  });

  it('should list all communications', async () => {
    const mockCommunications = [
      {
        id: 'comm-1',
        type: 'email',
        status: 'sent',
        customerId: 'customer-1',
        Customer: { id: 'customer-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '0123456789' },
        WorkOrder: null,
        createdAt: new Date(),
      },
      {
        id: 'comm-2',
        type: 'email',
        status: 'sent',
        customerId: 'customer-2',
        Customer: { id: 'customer-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', phone: '0987654321' },
        WorkOrder: { id: 'wo-1', status: 'completed' },
        createdAt: new Date(),
      },
    ];

    mockPrismaCommunicationFindMany.mockResolvedValue(mockCommunications);

    const req = new NextRequest('http://localhost/api/communications');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('type', 'email');
    expect(mockPrismaCommunicationFindMany).toHaveBeenCalled();
  });

  it('should filter communications by customerId', async () => {
    mockPrismaCommunicationFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/communications?customerId=customer-1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCommunicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'customer-1',
        }),
      })
    );
  });

  it('should filter communications by type', async () => {
    mockPrismaCommunicationFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/communications?type=email');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCommunicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'email',
        }),
      })
    );
  });

  it('should filter communications by status', async () => {
    mockPrismaCommunicationFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/communications?status=sent');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCommunicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'sent',
        }),
      })
    );
  });

  it('should limit results', async () => {
    mockPrismaCommunicationFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/communications?limit=10');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCommunicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it('should use default limit of 50', async () => {
    mockPrismaCommunicationFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/communications');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaCommunicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it('should require authentication', async () => {
    mockGetUserIdOrFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/communications');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should handle database errors', async () => {
    mockPrismaCommunicationFindMany.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/communications');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'list_failed');
  });
});

describe('POST /api/communications/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserIdOrFirst.mockResolvedValue('user-123');
    mockCanSendEmail.mockResolvedValue(true);
    mockIncrementEmailCount.mockResolvedValue(undefined);
    mockSendEmail.mockResolvedValue({ success: true });
    mockPrismaCommunicationCreate.mockResolvedValue({ id: 'comm-1' });
  });

  it('should require authentication', async () => {
    mockGetUserIdOrFirst.mockResolvedValue(null);

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'ticket_ready',
        customerId: 'customer-1',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should validate required fields', async () => {
    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        // Missing event and customerId
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'missing_fields');
  });

  it('should check license limits', async () => {
    mockCanSendEmail.mockResolvedValue(false);

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'ticket_ready',
        customerId: 'customer-1',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data).toHaveProperty('error', 'license_limit');
  });

  it('should return 404 if customer not found', async () => {
    mockPrismaCustomerFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'ticket_ready',
        customerId: 'customer-999',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'customer_not_found');
  });

  it('should return 404 if template not found', async () => {
    mockPrismaCustomerFindUnique.mockResolvedValue({
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      CustomerBike: [],
    });
    mockPrismaAppSettingFindUnique.mockResolvedValue({});
    mockPrismaEmailTemplateFindFirst.mockResolvedValue(null);

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'unknown_event',
        customerId: 'customer-1',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'template_not_found');
  });

  it('should send email successfully', async () => {
    mockPrismaCustomerFindUnique.mockResolvedValue({
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '0123456789',
      CustomerBike: [],
    });
    mockPrismaAppSettingFindUnique.mockResolvedValue({
      shopName: 'Test Shop',
      shopEmail: 'shop@test.com',
    });
    mockPrismaEmailTemplateFindFirst.mockResolvedValue({
      id: 'template-1',
      event: 'ticket_ready',
      subject: 'Your bike is ready',
      body: 'Hello {{customer.firstName}}',
      active: true,
    });

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'ticket_ready',
        customerId: 'customer-1',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(mockSendEmail).toHaveBeenCalled();
    expect(mockIncrementEmailCount).toHaveBeenCalled();
  });

  it('should include workOrder data if provided', async () => {
    mockPrismaCustomerFindUnique.mockResolvedValue({
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      CustomerBike: [],
    });
    mockPrismaWorkOrderFindUnique.mockResolvedValue({
      id: 'wo-1',
      type: 'repair',
      status: 'completed',
      CustomerBike: { brand: 'Trek', model: 'FX3' },
      WorkOrderLine: [],
    });
    mockPrismaAppSettingFindUnique.mockResolvedValue({});
    mockPrismaEmailTemplateFindFirst.mockResolvedValue({
      id: 'template-1',
      event: 'ticket_ready',
      subject: 'Your bike is ready',
      body: 'Hello {{customer.firstName}}',
      active: true,
    });

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'ticket_ready',
        customerId: 'customer-1',
        workOrderId: 'wo-1',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrismaWorkOrderFindUnique).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      include: expect.any(Object),
    });
  });

  it('should fallback to first user settings if not found', async () => {
    mockPrismaCustomerFindUnique.mockResolvedValue({
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      CustomerBike: [],
    });
    mockPrismaAppSettingFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      shopName: 'Fallback Shop',
    });
    mockPrismaUserFindFirst.mockResolvedValue({
      id: 'first-user',
      active: true,
    });
    mockPrismaEmailTemplateFindFirst.mockResolvedValue({
      id: 'template-1',
      event: 'ticket_ready',
      subject: 'Test',
      body: 'Test',
      active: true,
    });

    const req = new Request('http://localhost/api/communications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        event: 'ticket_ready',
        customerId: 'customer-1',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserFindFirst).toHaveBeenCalled();
  });
});
