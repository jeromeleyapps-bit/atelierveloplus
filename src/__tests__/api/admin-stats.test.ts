/**
 * Tests for GET /api/admin/stats
 * Tests admin statistics endpoint
 */

import { GET } from '@/app/api/admin/stats/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: jest.fn(),
    },
    workOrder: {
      count: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
    },
  },
}));

const mockPrismaUserCount = prisma.user.count as jest.Mock;
const mockPrismaWorkOrderCount = prisma.workOrder.count as jest.Mock;
const mockPrismaInvoiceCount = prisma.invoice.count as jest.Mock;

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return admin statistics', async () => {
    mockPrismaUserCount.mockResolvedValue(10);
    mockPrismaWorkOrderCount.mockResolvedValue(5);
    mockPrismaInvoiceCount.mockResolvedValue(3);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('totalUsers', 10);
    expect(data).toHaveProperty('activeTickets', 5);
    expect(data).toHaveProperty('pendingInvoices', 3);
    expect(data).toHaveProperty('dbSize');
    expect(data).toHaveProperty('lastBackup');
    
    // Verify that Prisma methods were called
    expect(mockPrismaUserCount).toHaveBeenCalled();
    expect(mockPrismaWorkOrderCount).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['pending', 'in_progress', 'waiting_parts'],
        },
      },
    });
    expect(mockPrismaInvoiceCount).toHaveBeenCalledWith({
      where: {
        type: 'invoice',
        status: 'issued',
      },
    });
  });
});
