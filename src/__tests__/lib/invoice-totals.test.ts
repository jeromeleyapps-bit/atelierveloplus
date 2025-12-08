import { recomputeTotals, InvoiceWithLines } from '@/lib/invoice-totals';

describe('recomputeTotals', () => {
  it('should calculate totals for invoice with lines', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 2,
          unitPriceHT: 50,
          unitPriceTTC: null,
          vatRate: 20,
        },
        {
          id: 'line-2',
          type: 'labor',
          qty: 1,
          unitPriceHT: 60,
          unitPriceTTC: null,
          vatRate: 20,
        },
      ],
    };

    const result = recomputeTotals(invoice);

    expect(result.subtotalHT).toBe(160); // (2 * 50) + (1 * 60)
    expect(result.vatAmount).toBeGreaterThan(0);
    expect(result.totalTTC).toBeGreaterThan(result.subtotalHT);
  });

  it('should handle zero quantity', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 0,
          unitPriceHT: 50,
          unitPriceTTC: null,
          vatRate: 20,
        },
      ],
    };

    const result = recomputeTotals(invoice);

    expect(result.subtotalHT).toBe(0);
    expect(result.totalTTC).toBe(0);
  });

  it('should handle discount amount', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      discountAmount: 10,
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 1,
          unitPriceHT: 100,
          unitPriceTTC: null,
          vatRate: 20,
        },
      ],
    };

    const result = recomputeTotals(invoice);

    expect(result.subtotalHT).toBe(100);
    expect(result.totalTTC).toBeLessThan(120); // Should be reduced by discount
  });

  it('should handle zero vatRate', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'AE_TTC',
      vatRate: 0,
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 1,
          unitPriceHT: 100,
          unitPriceTTC: null,
          vatRate: 0,
        },
      ],
    };

    const result = recomputeTotals(invoice);

    expect(result.subtotalHT).toBe(100);
    expect(result.vatAmount).toBe(0);
    expect(result.totalTTC).toBe(100);
  });

  it('should use line vatRate when provided', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 1,
          unitPriceHT: 100,
          unitPriceTTC: null,
          vatRate: 10, // Different from invoice vatRate
        },
      ],
    };

    const result = recomputeTotals(invoice);

    expect(result.subtotalHT).toBe(100);
    // Should use line vatRate (10%) instead of invoice vatRate (20%)
    expect(result.totalTTC).toBe(110);
  });

  it('should handle empty lines array', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      lines: [],
    };

    const result = recomputeTotals(invoice);

    expect(result.subtotalHT).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.totalTTC).toBe(0);
  });

  it('should round to 2 decimals', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 1,
          unitPriceHT: 33.333,
          unitPriceTTC: null,
          vatRate: 20,
        },
      ],
    };

    const result = recomputeTotals(invoice);

    // Check that values are rounded to 2 decimals (or integers)
    // Format: integer or decimal with max 2 decimals
    expect(result.subtotalHT.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    expect(result.vatAmount.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    expect(result.totalTTC.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    
    // Verify they are numbers
    expect(typeof result.subtotalHT).toBe('number');
    expect(typeof result.vatAmount).toBe('number');
    expect(typeof result.totalTTC).toBe('number');
  });

  it('should handle negative discount (should not make total negative)', () => {
    const invoice: InvoiceWithLines = {
      id: '1',
      pricingMode: 'HT_TVA',
      vatRate: 20,
      discountAmount: 1000, // Large discount
      lines: [
        {
          id: 'line-1',
          type: 'part',
          qty: 1,
          unitPriceHT: 100,
          unitPriceTTC: null,
          vatRate: 20,
        },
      ],
    };

    const result = recomputeTotals(invoice);

    expect(result.totalTTC).toBeGreaterThanOrEqual(0);
  });
});

