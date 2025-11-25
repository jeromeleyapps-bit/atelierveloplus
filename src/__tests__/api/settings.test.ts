/**
 * Tests for POST /api/settings, GET /api/settings/[key], PUT /api/settings/[key]
 * Tests global settings endpoints
 */

import { POST } from '@/app/api/settings/route';
import { GET, PUT } from '@/app/api/settings/[key]/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    globalSetting: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const mockPrismaGlobalSettingUpsert = prisma.globalSetting.upsert as jest.Mock;
const mockPrismaGlobalSettingFindUnique = prisma.globalSetting.findUnique as jest.Mock;

describe('POST /api/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create or update a setting', async () => {
    const mockSetting = { key: 'test_key', value: 'test_value' };
    mockPrismaGlobalSettingUpsert.mockResolvedValue(mockSetting);

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test_key', value: 'test_value' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ key: 'test_key', value: 'test_value' });
    expect(mockPrismaGlobalSettingUpsert).toHaveBeenCalledWith({
      where: { key: 'test_key' },
      update: { value: 'test_value' },
      create: { key: 'test_key', value: 'test_value' },
    });
  });

  it('should handle null value', async () => {
    const mockSetting = { key: 'test_key', value: null };
    mockPrismaGlobalSettingUpsert.mockResolvedValue(mockSetting);

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test_key', value: null }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.value).toBeNull();
  });

  it('should require key parameter', async () => {
    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'test_value' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'missing_key');
  });

  it('should handle invalid JSON body', async () => {
    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'missing_key');
  });

  it('should handle database errors', async () => {
    mockPrismaGlobalSettingUpsert.mockRejectedValue(new Error('DB error'));

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'test_key', value: 'test_value' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'internal_error');
  });
});

describe('GET /api/settings/[key]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a setting by key', async () => {
    const mockSetting = { key: 'test_key', value: 'test_value' };
    mockPrismaGlobalSettingFindUnique.mockResolvedValue(mockSetting);

    const req = new Request('http://localhost/api/settings/test_key');
    const res = await GET(req, { params: Promise.resolve({ key: 'test_key' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ key: 'test_key', value: 'test_value' });
  });

  it('should return null for non-existent key', async () => {
    mockPrismaGlobalSettingFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/settings/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ key: 'nonexistent' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ key: 'nonexistent', value: null });
  });
});

describe('PUT /api/settings/[key]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update a setting', async () => {
    mockPrismaGlobalSettingUpsert.mockResolvedValue({ key: 'test_key', value: 'new_value' });

    const req = new Request('http://localhost/api/settings/test_key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'new_value' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ key: 'test_key' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ key: 'test_key', value: 'new_value' });
    expect(mockPrismaGlobalSettingUpsert).toHaveBeenCalledWith({
      where: { key: 'test_key' },
      update: { value: 'new_value' },
      create: { key: 'test_key', value: 'new_value' },
    });
  });

  it('should handle null value', async () => {
    mockPrismaGlobalSettingUpsert.mockResolvedValue({ key: 'test_key', value: null });

    const req = new Request('http://localhost/api/settings/test_key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: null }),
    });

    const res = await PUT(req, { params: Promise.resolve({ key: 'test_key' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.value).toBeNull();
  });

  it('should handle invalid JSON body', async () => {
    mockPrismaGlobalSettingUpsert.mockResolvedValue({ key: 'test_key', value: null });

    const req = new Request('http://localhost/api/settings/test_key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const res = await PUT(req, { params: Promise.resolve({ key: 'test_key' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.value).toBeNull();
  });
});
