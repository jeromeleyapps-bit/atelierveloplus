/**
 * Tests for GET /api/customers/export
 * Tests customer export endpoint
 */

import { GET } from '@/app/api/customers/export/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrismaCustomerFindMany = prisma.customer.findMany as jest.Mock;

describe('GET /api/customers/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export customers as CSV', async () => {
    const mockCustomers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '0123456789',
        address1: '123 Main St',
        address2: 'Apt 4',
        zip: '75001',
        city: 'Paris',
        country: 'France',
        shipAddress1: null,
        shipAddress2: null,
        shipZip: null,
        shipCity: null,
        shipCountry: null,
        notes: 'Test notes',
      },
    ];

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('customers_');
    expect(text).toContain('Prénom');
    expect(text).toContain('John');
    expect(text).toContain('Doe');
  });

  it('should order customers by updatedAt desc', async () => {
    mockPrismaCustomerFindMany.mockResolvedValue([]);

    const res = await GET();

    expect(mockPrismaCustomerFindMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('should handle empty customer list', async () => {
    mockPrismaCustomerFindMany.mockResolvedValue([]);

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('Prénom'); // Headers still present
  });

  it('should escape quotes in CSV', async () => {
    const mockCustomers = [
      {
        firstName: 'John "Johnny"',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: null,
        address1: null,
        address2: null,
        zip: null,
        city: null,
        country: null,
        shipAddress1: null,
        shipAddress2: null,
        shipZip: null,
        shipCity: null,
        shipCountry: null,
        notes: null,
      },
    ];

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('John ""Johnny""'); // Quotes escaped
  });

  it('should handle null values', async () => {
    const mockCustomers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: null,
        phone: null,
        address1: null,
        address2: null,
        zip: null,
        city: null,
        country: null,
        shipAddress1: null,
        shipAddress2: null,
        shipZip: null,
        shipCity: null,
        shipCountry: null,
        notes: null,
      },
    ];

    mockPrismaCustomerFindMany.mockResolvedValue(mockCustomers);

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('John');
  });

  it('should include all required headers', async () => {
    mockPrismaCustomerFindMany.mockResolvedValue([]);

    const res = await GET();
    const text = await res.text();

    expect(text).toContain('Prénom');
    expect(text).toContain('Nom');
    expect(text).toContain('Email');
    expect(text).toContain('Téléphone');
    expect(text).toContain('Adresse');
    expect(text).toContain('Notes');
  });

  it('should generate filename with current date', async () => {
    mockPrismaCustomerFindMany.mockResolvedValue([]);

    const res = await GET();
    const disposition = res.headers.get('Content-Disposition');

    expect(disposition).toMatch(/customers_\d{4}-\d{2}-\d{2}\.csv/);
  });
});

