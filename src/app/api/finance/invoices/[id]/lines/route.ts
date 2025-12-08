import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { recomputeTotals } from "@/lib/invoice-totals";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// POST /api/finance/invoices/[id]/lines
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const body = await req.json();
  const inv = await prisma.invoice.findUnique({ where: { id: id }, include: { InvoiceLine: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Récupérer le statut auto-entrepreneur
  const isAutoEntrepreneur = await getIsAutoEntrepreneur();

  // Calculer les totaux de ligne
  // Support ancien format (qty, unitPriceHT) ET nouveau (quantity, priceHT)
  const qty = Number(body.quantity || body.qty || 1);
  const vatRate = isAutoEntrepreneur ? 0 : (body.vatRate != null ? Number(body.vatRate) : (inv.vatRate || 20));
  
  let unitPriceHT = 0;
  let unitPriceTTC = 0;
  let totalHT = 0;
  let totalTTC = 0;
  
  // Calcul standard HT + TVA
  // Support ancien format (unitPriceHT) ET nouveau (priceHT)
  unitPriceHT = Number(body.priceHT || body.unitPriceHT || 0);
  unitPriceTTC = unitPriceHT * (1 + (vatRate > 0 ? vatRate / 100 : 0));
  totalHT = unitPriceHT * qty;
  totalTTC = unitPriceTTC * qty;

  const line = await prisma.invoiceLine.create({
    data: {
      invoiceId: inv.id,
      type: String(body.type || 'part'),
      description: String(body.description || ''),
      qty,
      unitPriceHT: Math.round(unitPriceHT * 100) / 100,
      unitPriceTTC: Math.round(unitPriceTTC * 100) / 100,
      vatRate: vatRate,
      totalHT: Math.round(totalHT * 100) / 100,
      totalTTC: Math.round(totalTTC * 100) / 100,
    },
  });

  // Décrémentation stock automatique si pièce
  if (body.type === 'part' && body.sourceId) {
    try {
      const catalogItem = await prisma.catalogItem.findUnique({
        where: { id: body.sourceId }
      });
      
      if (catalogItem && catalogItem.stockQty && catalogItem.stockQty > 0) {
        await prisma.catalogItem.update({
          where: { id: body.sourceId },
          data: {
            stockQty: Math.max(0, catalogItem.stockQty - qty)
          }
        });
        logger.info(`[STOCK] Décrémenté: ${catalogItem.name} -${qty} (reste: ${Math.max(0, catalogItem.stockQty - qty)})`);
      }
    } catch (e) {
      logger.error('[STOCK] Erreur décrémentation:', e);
      // Ne pas bloquer la création de ligne si erreur stock
    }
  }

  const fresh = await prisma.invoice.findUnique({ where: { id: inv.id }, include: { InvoiceLine: true } });
  type InvoiceLineData = { id: string; type: string; qty: number; unitPriceHT: number; unitPriceTTC: number; vatRate: number };
  const totals = recomputeTotals({
    id: fresh!.id,
    pricingMode: fresh!.pricingMode,
    vatRate: fresh!.vatRate,
    discountAmount: fresh!.discountAmount || 0,
    lines: ((fresh as { InvoiceLine?: InvoiceLineData[] }).InvoiceLine || []).map((l: InvoiceLineData) => ({ id: l.id, type: l.type, qty: l.qty, unitPriceHT: l.unitPriceHT, unitPriceTTC: l.unitPriceTTC, vatRate: l.vatRate }))
  });
  await prisma.invoice.update({ where: { id: inv.id }, data: totals });

  return NextResponse.json(line, { status: 201 });
}
