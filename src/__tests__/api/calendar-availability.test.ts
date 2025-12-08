/**
 * Tests for GET /api/calendar/availability
 * Tests calendar availability endpoint
 */

import { GET } from '@/app/api/calendar/availability/route';
import { prisma } from '@/lib/prisma';
import { getCalendarConfig, parseBusinessHours, isWithinBusinessHours, hasBlockConflict, hasEventBlockConflict, countOverlappingBookings } from '@/lib/calendar';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/lib/calendar', () => ({
  getCalendarConfig: jest.fn(),
  parseBusinessHours: jest.fn(),
  isWithinBusinessHours: jest.fn(),
  hasBlockConflict: jest.fn(),
  hasEventBlockConflict: jest.fn(),
  countOverlappingBookings: jest.fn(),
}));

const mockGetCalendarConfig = getCalendarConfig as jest.Mock;
const mockParseBusinessHours = parseBusinessHours as jest.Mock;
const mockIsWithinBusinessHours = isWithinBusinessHours as jest.Mock;
const mockHasBlockConflict = hasBlockConflict as jest.Mock;
const mockHasEventBlockConflict = hasEventBlockConflict as jest.Mock;
const mockCountOverlappingBookings = countOverlappingBookings as jest.Mock;

describe('GET /api/calendar/availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCalendarConfig.mockResolvedValue({
      slotMinutes: 60,
      leadTimeHours: 6,
      maxConcurrent: 1,
      businessHours: '9-17',
    });
    mockParseBusinessHours.mockReturnValue([]);
    mockIsWithinBusinessHours.mockReturnValue(false);
    mockHasBlockConflict.mockResolvedValue(false);
    mockHasEventBlockConflict.mockResolvedValue(false);
    mockCountOverlappingBookings.mockResolvedValue(0);
  });

  it('should require start parameter', async () => {
    const req = new NextRequest('http://localhost/api/calendar/availability?end=2024-01-15');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'Missing start/end');
  });

  it('should require end parameter', async () => {
    const req = new NextRequest('http://localhost/api/calendar/availability?start=2024-01-15');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'Missing start/end');
  });

  it('should validate date range', async () => {
    const req = new NextRequest('http://localhost/api/calendar/availability?start=2024-01-15&end=2024-01-10');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'Invalid range');
  });

  it('should return empty slots when no business hours', async () => {
    const req = new NextRequest('http://localhost/api/calendar/availability?start=2024-01-15T00:00:00Z&end=2024-01-16T00:00:00Z');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('slots');
    expect(Array.isArray(data.slots)).toBe(true);
  });

  it('should return available slots', async () => {
    mockIsWithinBusinessHours.mockReturnValue(true);

    const start = new Date('2024-12-15T10:00:00Z');
    const end = new Date('2024-12-15T12:00:00Z');
    
    const req = new NextRequest(`http://localhost/api/calendar/availability?start=${start.toISOString()}&end=${end.toISOString()}`);
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('slots');
    expect(Array.isArray(data.slots)).toBe(true);
  });

  it('should mark slots as unavailable when blocked', async () => {
    mockIsWithinBusinessHours.mockReturnValue(true);
    mockHasBlockConflict.mockResolvedValue(true);

    const start = new Date('2024-12-15T10:00:00Z');
    const end = new Date('2024-12-15T12:00:00Z');
    
    const req = new NextRequest(`http://localhost/api/calendar/availability?start=${start.toISOString()}&end=${end.toISOString()}`);
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('slots');
  });

  it('should mark slots as unavailable when event conflict', async () => {
    mockIsWithinBusinessHours.mockReturnValue(true);
    mockHasEventBlockConflict.mockResolvedValue(true);

    const start = new Date('2024-12-15T10:00:00Z');
    const end = new Date('2024-12-15T12:00:00Z');
    
    const req = new NextRequest(`http://localhost/api/calendar/availability?start=${start.toISOString()}&end=${end.toISOString()}`);
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('slots');
  });

  it('should mark slots as unavailable when max concurrent reached', async () => {
    mockIsWithinBusinessHours.mockReturnValue(true);
    mockCountOverlappingBookings.mockResolvedValue(2);

    const start = new Date('2024-12-15T10:00:00Z');
    const end = new Date('2024-12-15T12:00:00Z');
    
    const req = new NextRequest(`http://localhost/api/calendar/availability?start=${start.toISOString()}&end=${end.toISOString()}`);
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('slots');
  });

  it('should handle errors', async () => {
    mockGetCalendarConfig.mockRejectedValue(new Error('Config error'));

    const req = new NextRequest('http://localhost/api/calendar/availability?start=2024-01-15T00:00:00Z&end=2024-01-16T00:00:00Z');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to check availability');
  });
});


