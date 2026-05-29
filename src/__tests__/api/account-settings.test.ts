/**
 * Tests for GET/PUT/PATCH /api/account/settings
 * Tests fetching and updating account settings
 */

import { GET, PUT, PATCH } from '@/app/api/account/settings/route';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    appSetting: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockPrismaUserCreate = prisma.user.create as jest.Mock;
const mockPrismaAppSettingFindUnique = prisma.appSetting.findUnique as jest.Mock;
const mockPrismaAppSettingUpdate = prisma.appSetting.update as jest.Mock;
const mockPrismaAppSettingUpsert = prisma.appSetting.upsert as jest.Mock;

describe('GET /api/account/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch settings for authenticated user', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const mockSettings = {
      userId: 'user-123',
      shopName: 'My Bike Shop',
      shopEmail: 'shop@example.com',
      shopPhone: '0123456789',
      address1: '123 Main St',
      address2: 'Suite 100',
      zip: '75001',
      city: 'Paris',
      country: 'France',
      shopLogo: '/logo.png',
      legalFooter: 'Legal info',
      siret: '12345678901234',
      tva: 'FR12345678901',
      rcs: 'RCS Paris',
      capital: '10000',
      insurance: 'Insurance Co',
      isAutoEntrepreneur: false,
      updatedAt: new Date('2024-01-01'),
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(mockSettings);

    const req = new Request('http://localhost/api/account/settings', {
      headers: { 'x-user-id': 'user-123' },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      shopName: 'My Bike Shop',
      shopEmail: 'shop@example.com',
      isAutoEntrepreneur: false,
    });
  });

  it('should return default values when no settings exist', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/account/settings', {
      headers: { 'x-user-id': 'user-123' },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      firstName: 'Jane',
      lastName: 'Smith',
      shopName: null,
      shopEmail: null,
      isAutoEntrepreneur: false,
    });
  });

  it('should use first user when no x-user-id header', async () => {
    const mockUser = {
      id: 'first-user',
      name: 'First User',
      email: 'first@example.com',
      role: 'admin',
    };

    mockPrismaUserFindFirst.mockResolvedValue(mockUser);
    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/account/settings');

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.firstName).toBe('First');
    expect(mockPrismaUserFindFirst).toHaveBeenCalled();
  });

  it('returns 404 noUser when DB is empty (no auto-create — Sprint 4.B)', async () => {
    mockPrismaUserFindFirst.mockResolvedValue(null);
    mockPrismaAppSettingFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/account/settings');

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ noUser: true });
    expect(mockPrismaUserCreate).not.toHaveBeenCalled();
  });

  it('should parse user name into firstName and lastName', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Marie Dupont',
      email: 'marie@example.com',
      role: 'admin',
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/account/settings', {
      headers: { 'x-user-id': 'user-123' },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(data.firstName).toBe('Marie');
    expect(data.lastName).toBe('Dupont');
  });
});

describe('PATCH /api/account/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update existing settings', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const existingSettings = {
      userId: 'user-123',
      shopName: 'Old Shop Name',
      shopEmail: 'old@example.com',
      isAutoEntrepreneur: false,
      updatedAt: new Date(),
    };

    const updatedSettings = {
      ...existingSettings,
      shopName: 'New Shop Name',
      shopEmail: 'new@example.com',
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(existingSettings);
    mockPrismaAppSettingUpdate.mockResolvedValue(updatedSettings);

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'user-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopName: 'New Shop Name',
        shopEmail: 'new@example.com',
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.shopName).toBe('New Shop Name');
    expect(data.shopEmail).toBe('new@example.com');
    expect(mockPrismaAppSettingUpdate).toHaveBeenCalled();
  });

  it('should create new settings if none exist', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const newSettings = {
      userId: 'user-123',
      shopName: 'New Shop',
      shopEmail: 'shop@example.com',
      isAutoEntrepreneur: true,
      updatedAt: new Date(),
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(null);
    mockPrismaAppSettingUpsert.mockResolvedValue(newSettings);

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'user-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopName: 'New Shop',
        shopEmail: 'shop@example.com',
        isAutoEntrepreneur: true,
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.shopName).toBe('New Shop');
    expect(data.isAutoEntrepreneur).toBe(true);
    expect(mockPrismaAppSettingUpsert).toHaveBeenCalled();
  });

  it('should handle isAutoEntrepreneur boolean correctly', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const updatedSettings = {
      userId: 'user-123',
      isAutoEntrepreneur: true,
      updatedAt: new Date(),
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue({ userId: 'user-123', isAutoEntrepreneur: false, updatedAt: new Date() });
    mockPrismaAppSettingUpdate.mockResolvedValue(updatedSettings);

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'user-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isAutoEntrepreneur: true,
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(data.isAutoEntrepreneur).toBe(true);
    expect(mockPrismaAppSettingUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      data: expect.objectContaining({
        isAutoEntrepreneur: true,
      }),
    });
  });

  it('should update all fields correctly', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const fullSettings = {
      userId: 'user-123',
      shopName: 'Complete Shop',
      shopEmail: 'complete@example.com',
      shopPhone: '0987654321',
      address1: '456 New St',
      address2: 'Floor 2',
      zip: '75002',
      city: 'Lyon',
      country: 'France',
      shopLogo: '/new-logo.png',
      legalFooter: 'New legal info',
      siret: '98765432109876',
      tva: 'FR98765432109',
      rcs: 'RCS Lyon',
      capital: '20000',
      insurance: 'New Insurance',
      isAutoEntrepreneur: true,
      updatedAt: new Date(),
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue({ userId: 'user-123', updatedAt: new Date() });
    mockPrismaAppSettingUpdate.mockResolvedValue(fullSettings);

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'user-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopName: 'Complete Shop',
        shopEmail: 'complete@example.com',
        shopPhone: '0987654321',
        address1: '456 New St',
        address2: 'Floor 2',
        zip: '75002',
        city: 'Lyon',
        country: 'France',
        shopLogo: '/new-logo.png',
        legalFooter: 'New legal info',
        siret: '98765432109876',
        tva: 'FR98765432109',
        rcs: 'RCS Lyon',
        capital: '20000',
        insurance: 'New Insurance',
        isAutoEntrepreneur: true,
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      shopName: 'Complete Shop',
      shopEmail: 'complete@example.com',
      city: 'Lyon',
      isAutoEntrepreneur: true,
    });
  });

  it('should handle shopName as null', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const updatedSettings = {
      userId: 'user-123',
      shopName: null,
      updatedAt: new Date(),
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue({ userId: 'user-123', shopName: 'Old Name', updatedAt: new Date() });
    mockPrismaAppSettingUpdate.mockResolvedValue(updatedSettings);

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'user-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopName: null,
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(data.shopName).toBeNull();
  });

  it('should use first user when no x-user-id header', async () => {
    const mockUser = {
      id: 'first-user',
      name: 'First User',
      email: 'first@example.com',
      role: 'admin',
    };

    mockPrismaUserFindFirst.mockResolvedValue(mockUser);
    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue(null);
    mockPrismaAppSettingUpsert.mockResolvedValue({
      userId: 'first-user',
      shopName: 'Test Shop',
      updatedAt: new Date(),
    });

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName: 'Test Shop' }),
    });

    const res = await PATCH(req);

    expect(res.status).toBe(200);
    expect(mockPrismaUserFindFirst).toHaveBeenCalled();
  });
});

describe('PUT /api/account/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should alias to PATCH', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    };

    const updatedSettings = {
      userId: 'user-123',
      shopName: 'Updated via PUT',
      updatedAt: new Date(),
    };

    mockPrismaUserFindUnique.mockResolvedValue(mockUser);
    mockPrismaAppSettingFindUnique.mockResolvedValue({ userId: 'user-123', updatedAt: new Date() });
    mockPrismaAppSettingUpdate.mockResolvedValue(updatedSettings);

    const req = new Request('http://localhost/api/account/settings', {
      method: 'PUT',
      headers: {
        'x-user-id': 'user-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shopName: 'Updated via PUT' }),
    });

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.shopName).toBe('Updated via PUT');
  });
});

