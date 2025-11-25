import { GET, DELETE } from '@/app/api/workshop/workorders/[id]/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { getUserId } from '@/lib/api-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workOrder: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock;
const mockPrismaWorkOrderCreate = prisma.workOrder.create as jest.Mock;
const mockPrismaWorkOrderDelete = prisma.workOrder.delete as jest.Mock;
const mockGetUserId = getUserId as jest.Mock;

describe('GET /api/workshop/workorders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUserId.mockReturnValue(null);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1') as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should return existing workorder', async () => {
    mockGetUserId.mockReturnValue('user-123');
    const mockWorkOrder = {
      id: 'workorder-1',
      status: 'pending',
      Customer: null,
      CustomerBike: null,
    };

    mockPrismaWorkOrderFindUnique.mockResolvedValue(mockWorkOrder);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ id: 'workorder-1', status: 'pending' });
  });

  it('should create workorder if not found', async () => {
    mockGetUserId.mockReturnValue('user-123');
    const mockWorkOrder = {
      id: 'workorder-1',
      status: 'created',
      Customer: null,
      CustomerBike: null,
    };

    mockPrismaWorkOrderFindUnique.mockResolvedValue(null);
    mockPrismaWorkOrderCreate.mockResolvedValue(mockWorkOrder);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ id: 'workorder-1', status: 'created' });
    expect(mockPrismaWorkOrderCreate).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockGetUserId.mockReturnValue('user-123');
    mockPrismaWorkOrderFindUnique.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1', {
      headers: { 'x-user-id': 'user-123' },
    }) as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'workorder_fetch_failed');
  });
});

describe('DELETE /api/workshop/workorders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUserId.mockReturnValue(null);

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1', {
      method: 'DELETE',
    }) as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await DELETE(req, { params });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toHaveProperty('error', 'unauthorized');
  });

  it('should delete workorder when authenticated', async () => {
    mockGetUserId.mockReturnValue('user-123');
    mockPrismaWorkOrderDelete.mockResolvedValue({ id: 'workorder-1' });

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1', {
      method: 'DELETE',
      headers: { 'x-user-id': 'user-123' },
    }) as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    expect(mockPrismaWorkOrderDelete).toHaveBeenCalledWith({
      where: { id: 'workorder-1' },
    });
  });

  it('should handle database errors', async () => {
    mockGetUserId.mockReturnValue('user-123');
    mockPrismaWorkOrderDelete.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/workshop/workorders/workorder-1', {
      method: 'DELETE',
      headers: { 'x-user-id': 'user-123' },
    }) as any;
    const params = Promise.resolve({ id: 'workorder-1' });
    const res = await DELETE(req, { params });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error');
  });
});
