import { describe, it, expect, vi } from 'vitest';

// Mock calendar helpers to control availability output
vi.mock('@/lib/calendar', () => ({
  getCalendarConfig: vi.fn(async () => ({
    slotMinutes: 60,
    leadTimeHours: 0,
    maxConcurrent: 1,
    businessHours: [{ dow: [1,2,3,4,5], start: '09:00', end: '18:00' }],
  })),
  parseBusinessHours: vi.fn((v) => v),
  isWithinBusinessHours: vi.fn(() => true),
  hasBlockConflict: vi.fn(async () => false),
  hasEventBlockConflict: vi.fn(async () => false),
  countOverlappingBookings: vi.fn(async () => 0),
}));

import * as availabilityRoute from '../../src/app/api/calendar/availability/route';

function urlWithRange(start: Date, end: Date) {
  const u = new URL('http://localhost/api/calendar/availability');
  u.searchParams.set('start', start.toISOString());
  u.searchParams.set('end', end.toISOString());
  return u.toString();
}

describe('GET /api/calendar/availability', () => {
  it('returns 400 for missing params', async () => {
    const req = new Request('http://localhost/api/calendar/availability');
    const res = await (availabilityRoute as any).GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid range', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 3600_000);
    const end = new Date(now.getTime() - 3600_000);
    const req = new Request(urlWithRange(start, end));
    const res = await (availabilityRoute as any).GET(req as any);
    expect(res.status).toBe(400);
  });

  it('returns slots for valid range', async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 3600_000); // tomorrow
    const end = new Date(start.getTime() + 6 * 3600_000); // +6h window
    const req = new Request(urlWithRange(start, end));
    const res = await (availabilityRoute as any).GET(req as any);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(Array.isArray(j.slots)).toBe(true);
    expect(j.slots.length).toBeGreaterThan(0);
    // Each slot has start/end ISO strings
    expect(j.slots[0]).toHaveProperty('start');
    expect(j.slots[0]).toHaveProperty('end');
  });
});
