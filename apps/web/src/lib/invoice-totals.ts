export type InvoiceWithLines = {
  id: string;
  pricingMode: string; // 'AE_TTC' | 'HT_TVA'
  vatRate: number;
  discountAmount?: number | null;
  lines: Array<{
    id: string;
    type: string; // 'part' | 'labor' | 'custom'
    qty: number;
    unitPriceHT: number | null;
    unitPriceTTC: number | null;
    vatRate: number | null;
  }>;
};

export function recomputeTotals(inv: InvoiceWithLines) {
  const isAE = inv.pricingMode === 'AE_TTC';
  const invVat = Number(inv.vatRate || 0);
  let subtotalHT = 0;
  let vatAmount = 0;
  let totalTTC = 0;

  for (const l of inv.lines) {
    const qty = Number(l.qty || 0);
    // En mode AE, forcer TVA à 0
    const lineVat = isAE ? 0 : (l.vatRate != null ? Number(l.vatRate) : invVat);
    if (isAE) {
      const unitTTC = Number(l.unitPriceTTC || 0);
      const lineTTC = unitTTC * qty;
      // En mode AE, pas de TVA donc HT = TTC
      subtotalHT += lineTTC;
      totalTTC += lineTTC;
    } else {
      const unitHT = Number(l.unitPriceHT || 0);
      const lineHT = unitHT * qty;
      subtotalHT += lineHT;
      totalTTC += lineHT * (1 + (lineVat > 0 ? lineVat / 100 : 0));
    }
  }

  // Apply discountAmount to totalTTC directly (simple approach)
  const discount = Number(inv.discountAmount || 0);
  if (discount > 0) {
    totalTTC = Math.max(0, totalTTC - discount);
    // approximate vatAmount from difference between TTC and HT theoretical
  }
  // Derive vatAmount from TTC - HT
  vatAmount = Math.max(0, totalTTC - subtotalHT);

  // Round to 2 decimals
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    subtotalHT: r2(subtotalHT),
    vatAmount: r2(vatAmount),
    totalTTC: r2(totalTTC),
  };
}
