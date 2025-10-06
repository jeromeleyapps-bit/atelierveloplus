import { describe, it, expect } from 'vitest';
import { recomputeTotals, type InvoiceWithLines } from '../../src/lib/invoice-totals';

function makeBase(mode: 'AE_TTC' | 'HT_TVA', vatRate = 20): InvoiceWithLines {
  return {
    id: 'inv1',
    pricingMode: mode,
    vatRate,
    discountAmount: 0,
    lines: [],
  };
}

describe('recomputeTotals', () => {
  it('AE_TTC: converts TTC to HT per line, sums and rounds', () => {
    const inv: InvoiceWithLines = {
      ...makeBase('AE_TTC', 20),
      lines: [
        { id: 'l1', type: 'part', qty: 2, unitPriceHT: null, unitPriceTTC: 12.99, vatRate: null },
        { id: 'l2', type: 'labor', qty: 1, unitPriceHT: null, unitPriceTTC: 30, vatRate: 20 },
      ],
    };
    const t = recomputeTotals(inv);
    // HT ~ 12.99 / 1.2 = 10.825 -> 2x = 21.65; + 30/1.2 = 25 -> total HT ~ 46.65
    expect(t.subtotalHT).toBeCloseTo(46.65, 2);
    // TTC = 2*12.99 + 30 = 55.98
    expect(t.totalTTC).toBeCloseTo(55.98, 2);
    // VAT = TTC - HT
    expect(t.vatAmount).toBeCloseTo(9.33, 2);
  });

  it('HT_TVA: sums HT, applies VAT and discount, rounds consistently', () => {
    const inv: InvoiceWithLines = {
      ...makeBase('HT_TVA', 20),
      discountAmount: 5.0,
      lines: [
        { id: 'l1', type: 'part', qty: 3, unitPriceHT: 10, unitPriceTTC: null, vatRate: 10 }, // uses line vat
        { id: 'l2', type: 'custom', qty: 1, unitPriceHT: 25.5, unitPriceTTC: null, vatRate: null }, // uses inv vat
      ],
    };
    const t = recomputeTotals(inv);
    // subtotalHT = 3*10 + 25.5 = 55.5
    expect(t.subtotalHT).toBeCloseTo(55.5, 2);
    // TTC (before discount) = (3*10)*(1+0.10) + 25.5*(1+0.20) = 33 + 30.6 = 63.6
    // After discount 5 -> 58.6
    expect(t.totalTTC).toBeCloseTo(58.6, 2);
    // VAT = TTC - HT after discount = 58.6 - 55.5 = 3.1
    expect(t.vatAmount).toBeCloseTo(3.1, 2);
  });
});
