/**
 * Tests for GET /api/catalog/barcode
 * Tests barcode lookup endpoint
 */

import { GET } from '@/app/api/catalog/barcode/route';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = jest.fn();

describe('GET /api/catalog/barcode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require barcode parameter', async () => {
    const req = new NextRequest('http://localhost/api/catalog/barcode');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'Missing barcode parameter');
  });

  it('should validate barcode format', async () => {
    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=invalid');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toHaveProperty('error', 'Invalid barcode format. Must be 8-14 digits.');
  });

  it('should accept valid EAN-13 barcode', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=3760178622314');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('barcode', '3760178622314');
  });

  it('should accept valid EAN-8 barcode', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=12345678');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('barcode', '12345678');
  });

  it('should return not found when no results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=1234567890123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('found', false);
    expect(data).toHaveProperty('message');
  });

  it('should return found product from Open Food Facts', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          product_name: 'Test Product',
          brands: 'Test Brand',
          image_url: 'https://example.com/image.jpg',
        },
      }),
    });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=1234567890123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('found', true);
    expect(data).toHaveProperty('name', 'Test Product');
    expect(data).toHaveProperty('brand', 'Test Brand');
    expect(data).toHaveProperty('source', 'Open Food Facts');
  });

  it('should return found product from Open Product Data', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // Open Food Facts fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test Product',
          vendor: 'Test Vendor',
        }),
      });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=1234567890123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('found', true);
    expect(data).toHaveProperty('name', 'Test Product');
    expect(data).toHaveProperty('brand', 'Test Vendor');
    expect(data).toHaveProperty('source', 'Open Product Data');
  });

  it('should return found product from UPC Item DB', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // Open Food Facts fails
      .mockResolvedValueOnce({ ok: false }) // Open Product Data fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              title: 'Test Product',
              brand: 'Test Brand',
              images: ['https://example.com/image.jpg'],
            },
          ],
        }),
      });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=1234567890123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('found', true);
    expect(data).toHaveProperty('name', 'Test Product');
    expect(data).toHaveProperty('brand', 'Test Brand');
    expect(data).toHaveProperty('source', 'UPC Item DB');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=1234567890123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('found', false);
  });

  it('should indicate retailer search availability', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const req = new NextRequest('http://localhost/api/catalog/barcode?barcode=1234567890123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('canSearchRetailers', true);
  });
});


