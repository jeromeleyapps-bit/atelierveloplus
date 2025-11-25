import { GET, POST } from '@/app/api/calendar/bookings/route';
import { prisma } from '@/lib/prisma';
import { createMockRequest } from '../helpers/test-request';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/license-guards', () => ({
  checkBookingAccess: jest.fn(),
  checkEmailLicense: jest.fn(),
  incrementEmailAfterSend: jest.fn(),
}));

jest.mock('@/lib/calendar', () => ({
  getCalendarConfig: jest.fn(),
  parseBusinessHours: jest.fn(),
  isWithinBusinessHours: jest.fn(),
  hasBlockConflict: jest.fn(),
  hasEventBlockConflict: jest.fn(),
  countOverlappingBookings: jest.fn(),
}));

jest.mock('@/lib/email-with-db-config', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/email-templates', () => ({
  generateBookingConfirmationHTML: jest.fn(),
  generateBookingNotificationHTML: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrismaBookingFindMany = prisma.booking.findMany as jest.Mock;
const mockPrismaBookingCreate = prisma.booking.create as jest.Mock;
const { checkBookingAccess } = require('@/lib/license-guards');
const { getCalendarConfig, parseBusinessHours, isWithinBusinessHours, hasBlockConflict, countOverlappingBookings } = require('@/lib/calendar');

describe('GET /api/calendar/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 503 if Prisma is not available', async () => {
    const originalPrisma = prisma;
    (prisma as any) = null;

    const req = createMockRequest('http://localhost:3000/api/calendar/bookings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('error', 'prisma_unavailable');

    (prisma as any) = originalPrisma;
  });

  it('should return all bookings', async () => {
    const mockBookings = [
      {
        id: '1',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        name: 'Test Booking',
      },
    ];

    mockPrismaBookingFindMany.mockResolvedValue(mockBookings);

    const req = createMockRequest('http://localhost:3000/api/calendar/bookings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: '1', name: 'Test Booking' });
  });

  it('should filter bookings by date range', async () => {
    mockPrismaBookingFindMany.mockResolvedValue([]);

    const req = createMockRequest('http://localhost:3000/api/calendar/bookings?start=2024-01-01&end=2024-01-31') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrismaBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          start: expect.anything(),
          end: expect.anything(),
        }),
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaBookingFindMany.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('http://localhost:3000/api/calendar/bookings') as any;
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to fetch bookings');
  });
});

describe('POST /api/calendar/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkBookingAccess.mockResolvedValue(null);
    getCalendarConfig.mockResolvedValue({
      timezone: 'Europe/Paris',
      slotMinutes: 60,
      leadTimeHours: 6,
      maxConcurrent: 1,
      businessHours: '{}',
    });
    parseBusinessHours.mockReturnValue([]);
    isWithinBusinessHours.mockReturnValue(true);
    hasBlockConflict.mockResolvedValue(false);
    countOverlappingBookings.mockResolvedValue(0);
  });

  it('should return error if booking access denied', async () => {
    checkBookingAccess.mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: 'license_required' }),
    });

    const req = createMockRequest('http://localhost:3000/api/calendar/bookings', {
      method: 'POST',
      body: {
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        name: 'Test',
        email: 'test@example.com',
      },
    }) as any;

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('should return 400 for invalid input (missing email/phone)', async () => {
    const req = createMockRequest('http://localhost:3000/api/calendar/bookings', {
      method: 'POST',
      body: {
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        name: 'Test',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should return 400 for invalid time range', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const req = createMockRequest('http://localhost:3000/api/calendar/bookings', {
      method: 'POST',
      body: {
        start: pastDate,
        end: pastDate,
        name: 'Test',
        email: 'test@example.com',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'Invalid time range');
  });

  it('should return 400 if lead time not respected', async () => {
    const soonDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
    const req = createMockRequest('http://localhost:3000/api/calendar/bookings', {
      method: 'POST',
      body: {
        start: soonDate,
        name: 'Test',
        email: 'test@example.com',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('should create booking with valid data', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const mockBooking = {
      id: '1',
      start: futureDate,
      end: new Date(futureDate.getTime() + 60 * 60 * 1000),
      name: 'Test Booking',
      email: 'test@example.com',
    };

    mockPrismaBookingCreate.mockResolvedValue(mockBooking);

    const req = createMockRequest('http://localhost:3000/api/calendar/bookings', {
      method: 'POST',
      body: {
        start: futureDate.toISOString(),
        name: 'Test Booking',
        email: 'test@example.com',
      },
    }) as any;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ id: '1', name: 'Test Booking' });
  });
});
