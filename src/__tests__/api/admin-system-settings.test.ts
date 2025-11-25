import { GET, PUT } from '@/app/api/admin/system-settings/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { getCache, setCache } from '@/lib/cache';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    systemSettings: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  getUserIdOrFirst: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  invalidateCache: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockPrismaSystemSettingsUpsert = prisma.systemSettings.upsert as jest.Mock;
const mockGetUserIdOrFirst = getUserIdOrFirst as jest.Mock;
const mockGetCache = getCache as jest.Mock;
const mockSetCache = setCache as jest.Mock;

describe('GET /api/admin/system-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCache.mockReturnValue(null);
  });

  it('should return 503 if Prisma is not available', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'database_unavailable');

    (prisma as any) = originalPrisma;
  });

  it('should return default settings when no user found', async () => {
    mockGetUserIdOrFirst.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('notificationsEnabled', true);
    expect(data).toHaveProperty('emailProvider', 'resend');
  });

  it('should return cached settings if available', async () => {
    const cachedSettings = {
      notificationsEnabled: true,
      emailProvider: 'gmail',
    };

    mockGetUserIdOrFirst.mockResolvedValue('user-123');
    mockGetCache.mockReturnValue(cachedSettings);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(cachedSettings);
    expect(mockGetCache).toHaveBeenCalledWith('system-settings:user-123');
  });

  it('should fetch and cache settings from database', async () => {
    const mockSettings = {
      userId: 'user-123',
      notificationsEnabled: true,
      emailProvider: 'resend',
    };

    mockGetUserIdOrFirst.mockResolvedValue('user-123');
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user-123' });
    mockPrismaSystemSettingsUpsert.mockResolvedValue(mockSettings);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaSystemSettingsUpsert).toHaveBeenCalled();
    expect(mockSetCache).toHaveBeenCalled();
  });

  it('should return default settings when user not found in DB', async () => {
    mockGetUserIdOrFirst.mockResolvedValue('user-123');
    mockPrismaUserFindUnique.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('notificationsEnabled', true);
  });
});

describe('PUT /api/admin/system-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no user found', async () => {
    mockGetUserIdOrFirst.mockResolvedValue(null);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings', {
      method: 'PUT',
      body: { notificationsEnabled: false },
    }) as any;

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'no_user_found');
  });

  it('should update settings with format 1 (setting + value)', async () => {
    const mockSettings = {
      userId: 'user-123',
      notificationsEnabled: false,
    };

    mockGetUserIdOrFirst.mockResolvedValue('user-123');
    mockPrismaSystemSettingsUpsert.mockResolvedValue(mockSettings);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings', {
      method: 'PUT',
      body: {
        setting: 'notificationsEnabled',
        value: false,
      },
    }) as any;

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaSystemSettingsUpsert).toHaveBeenCalled();
  });

  it('should update settings with format 2 (object)', async () => {
    const mockSettings = {
      userId: 'user-123',
      notificationsEnabled: false,
      emailProvider: 'gmail',
    };

    mockGetUserIdOrFirst.mockResolvedValue('user-123');
    mockPrismaSystemSettingsUpsert.mockResolvedValue(mockSettings);

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings', {
      method: 'PUT',
      body: {
        notificationsEnabled: false,
        emailProvider: 'gmail',
      },
    }) as any;

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaSystemSettingsUpsert).toHaveBeenCalled();
  });

  it('should return 400 for invalid key', async () => {
    mockGetUserIdOrFirst.mockResolvedValue('user-123');

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings', {
      method: 'PUT',
      body: {
        setting: 'invalidKey',
        value: true,
      },
    }) as any;

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'invalid_key');
  });

  it('should validate smtpPort range', async () => {
    mockGetUserIdOrFirst.mockResolvedValue('user-123');

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings', {
      method: 'PUT',
      body: {
        smtpPort: 70000, // Invalid (out of range)
      },
    }) as any;

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'invalid_value');
  });

  it('should validate backupFrequency', async () => {
    mockGetUserIdOrFirst.mockResolvedValue('user-123');

    const req = createMockRequest('http://localhost:3000/api/admin/system-settings', {
      method: 'PUT',
      body: {
        backupFrequency: 'invalid',
      },
    }) as any;

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'invalid_value');
  });
});
