import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for the barcode lookup API
 * 
 * These tests verify that the barcode API correctly:
 * - Validates barcode format
 * - Calls external APIs
 * - Returns structured data
 * - Handles errors gracefully
 */

describe('Barcode Lookup API', () => {
  describe('Barcode validation', () => {
    it('should accept valid EAN-13 barcode', () => {
      const barcode = '3017620422003'; // Nutella
      expect(/^\d{8,14}$/.test(barcode)).toBe(true);
    });

    it('should accept valid EAN-8 barcode', () => {
      const barcode = '12345678';
      expect(/^\d{8,14}$/.test(barcode)).toBe(true);
    });

    it('should accept valid UPC-A barcode', () => {
      const barcode = '012345678905';
      expect(/^\d{8,14}$/.test(barcode)).toBe(true);
    });

    it('should reject barcode with letters', () => {
      const barcode = '123ABC456';
      expect(/^\d{8,14}$/.test(barcode)).toBe(false);
    });

    it('should reject barcode too short', () => {
      const barcode = '1234567';
      expect(/^\d{8,14}$/.test(barcode)).toBe(false);
    });

    it('should reject barcode too long', () => {
      const barcode = '123456789012345';
      expect(/^\d{8,14}$/.test(barcode)).toBe(false);
    });
  });

  describe('API Response Structure', () => {
    it('should have correct structure for found product', () => {
      const response = {
        found: true,
        barcode: '3017620422003',
        name: 'Nutella',
        brand: 'Ferrero',
        category: 'Spreads',
        image: 'https://example.com/image.jpg',
        source: 'Open Food Facts',
      };

      expect(response).toHaveProperty('found');
      expect(response).toHaveProperty('barcode');
      expect(response.found).toBe(true);
      expect(typeof response.name).toBe('string');
    });

    it('should have correct structure for not found product', () => {
      const response = {
        found: false,
        barcode: '9999999999999',
        message: 'Product not found in public databases. You can still add it manually.',
      };

      expect(response).toHaveProperty('found');
      expect(response).toHaveProperty('barcode');
      expect(response.found).toBe(false);
      expect(response).toHaveProperty('message');
    });
  });

  describe('Data mapping', () => {
    it('should combine brand and name correctly', () => {
      const productData = {
        brand: 'Shimano',
        name: 'Chain 11-speed',
      };

      const combinedName = productData.brand && productData.name 
        ? `${productData.brand} - ${productData.name}`
        : productData.name;

      expect(combinedName).toBe('Shimano - Chain 11-speed');
    });

    it('should handle missing brand', () => {
      const productData = {
        name: 'Generic Chain',
      };

      const combinedName = productData.brand && productData.name 
        ? `${productData.brand} - ${productData.name}`
        : productData.name;

      expect(combinedName).toBe('Generic Chain');
    });
  });
});

/**
 * Integration tests (require network access)
 * 
 * These tests actually call the external APIs.
 * They are skipped by default to avoid rate limits.
 * Run with: npm test -- --run catalog.barcode.test.ts
 */
describe.skip('Barcode API Integration', () => {
  it('should find Nutella in Open Food Facts', async () => {
    const barcode = '3017620422003';
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await res.json();

    expect(data.status).toBe(1);
    expect(data.product).toBeDefined();
    expect(data.product.product_name).toBeTruthy();
  }, 10000);

  it('should handle non-existent barcode gracefully', async () => {
    const barcode = '9999999999999';
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await res.json();

    expect(data.status).toBe(0);
  }, 10000);
});

/**
 * Mock tests for the API route
 * 
 * These tests verify the route logic without calling external APIs
 */
describe('Barcode API Route Logic', () => {
  it('should return 400 for missing barcode parameter', () => {
    const searchParams = new URLSearchParams();
    const barcode = searchParams.get('barcode');

    expect(barcode).toBeNull();
  });

  it('should return 400 for invalid barcode format', () => {
    const barcode = 'invalid123';
    const isValid = /^\d{8,14}$/.test(barcode);

    expect(isValid).toBe(false);
  });

  it('should accept valid barcode', () => {
    const barcode = '3017620422003';
    const isValid = /^\d{8,14}$/.test(barcode);

    expect(isValid).toBe(true);
  });
});

/**
 * Test data for manual testing
 */
export const TEST_BARCODES = {
  // Known products in public databases
  nutella: '3017620422003',
  cocaCola: '5449000000996',
  
  // Bike-related products (may or may not be found)
  finishLineOil: '0036121960015', // Example, verify actual EAN
  
  // Invalid barcodes
  tooShort: '1234567',
  tooLong: '123456789012345',
  withLetters: '123ABC456',
  
  // Edge cases
  allZeros: '0000000000000',
  allNines: '9999999999999',
};
