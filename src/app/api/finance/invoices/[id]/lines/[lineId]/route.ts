import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeTotals } from "@/lib/invoice-totals";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Types pour InvoiceLine avec InvoiceLine incluse
type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { InvoiceLine: true };
}>;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {  const { id, lineId } = await params;

  // Removed getPrisma() - using direct import
  const body = await req.json();

  const data: Prisma.InvoiceLineUpdateInput = {};
  if (body.type != null) data.type = String(body.type);
  if (body.description != null) data.description = String(body.description);
  if (body.qty != null) data.qty = Number(body.qty);
  if (body.unitPriceHT !== undefined) data.unitPriceHT = body.unitPriceHT == null ? null : Number(body.unitPriceHT);
  if (body.unitPriceTTC !== undefined) data.unitPriceTTC = body.unitPriceTTC == null ? null : Number(body.unitPriceTTC);
  if (body.vatRate !== undefined) data.vatRate = body.vatRate == null ? null : Number(body.vatRate);
  if (body.partId !== undefined) data.partId = body.partId == null ? null : String(body.partId);
  if (body.purchasePriceHT !== undefined) data.purchasePriceHT = body.purchasePriceHT == null ? null : Number(body.purchasePriceHT);

  // Récupérer la ligne actuelle pour avoir toutes les valeurs
  const currentLine = await prisma.invoiceLine.findUnique({ where: { id: lineId } });
  if (!currentLine) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  // Récupérer la facture pour connaître le pricingMode et la TVA par défaut
  const invoice = await prisma.invoice.findUnique({ where: { id: id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Fusionner les données actuelles avec les nouvelles
  const mergedData = { ...currentLine, ...data };
  
  // Recalculer les totaux de la ligne de façon robuste selon le mode de pricing
  const qty = mergedData.qty != null ? Number(mergedData.qty) : 1;
  const vatRate = mergedData.vatRate != null ? Number(mergedData.vatRate) : (invoice.vatRate || 0);
  const isAE = invoice.pricingMode === 'AE_TTC';

  if (isAE) {
    // Source principale: unitPriceTTC. Si on ne l'a pas mais on a unitPriceHT et vatRate, on le dérive
    let unitPriceTTC = mergedData.unitPriceTTC != null ? Number(mergedData.unitPriceTTC) : null;
    if (unitPriceTTC == null && mergedData.unitPriceHT != null) {
      const uht = Number(mergedData.unitPriceHT);
      unitPriceTTC = uht * (1 + (vatRate > 0 ? vatRate / 100 : 0));
      data.unitPriceTTC = Math.round(unitPriceTTC * 100) / 100;
    }
    if (unitPriceTTC != null) {
      const totalTTC = unitPriceTTC * qty;
      const totalHT = vatRate > 0 ? totalTTC / (1 + vatRate / 100) : totalTTC;
      if (data.unitPriceTTC == null) data.unitPriceTTC = Math.round(unitPriceTTC * 100) / 100;
      data.totalTTC = Math.round(totalTTC * 100) / 100;
      data.totalHT = Math.round(totalHT * 100) / 100;
      // Optionnel: stocker unitPriceHT dérivé pour cohérence affichage
      data.unitPriceHT = Math.round(((vatRate > 0 ? unitPriceTTC / (1 + vatRate / 100) : unitPriceTTC)) * 100) / 100;
    }
  } else {
    // Mode HT_TVA: source principale unitPriceHT; si on a unitPriceTTC + vatRate on peut dériver unitPriceHT
    let unitPriceHT = mergedData.unitPriceHT != null ? Number(mergedData.unitPriceHT) : null;
    if (unitPriceHT == null && mergedData.unitPriceTTC != null) {
      const uttc = Number(mergedData.unitPriceTTC);
      unitPriceHT = vatRate > 0 ? uttc / (1 + vatRate / 100) : uttc;
      data.unitPriceHT = Math.round(unitPriceHT * 100) / 100;
    }
    if (unitPriceHT != null) {
      const unitPriceTTC = unitPriceHT * (1 + (vatRate > 0 ? vatRate / 100 : 0));
      const totalHT = unitPriceHT * qty;
      const totalTTC = unitPriceTTC * qty;
      if (data.unitPriceHT == null) data.unitPriceHT = Math.round(unitPriceHT * 100) / 100;
      data.unitPriceTTC = Math.round(unitPriceTTC * 100) / 100;
      data.totalHT = Math.round(totalHT * 100) / 100;
      data.totalTTC = Math.round(totalTTC * 100) / 100;
    }
  }

  const updated = await prisma.invoiceLine.update({ where: { id: lineId }, data });

  // recompute totals
  const fresh = await prisma.invoice.findUnique({ where: { id: id }, include: { InvoiceLine: true } }) as InvoiceWithLines | null;
  if (fresh) {
    const totals = recomputeTotals({
      id: fresh.id,
      pricingMode: fresh.pricingMode,
      vatRate: fresh.vatRate,
      discountAmount: fresh.discountAmount || 0,
      lines: (fresh.InvoiceLine || []).map((l) => ({ 
        id: l.id, 
        type: l.type, 
        qty: l.qty, 
        unitPriceHT: l.unitPriceHT, 
        unitPriceTTC: l.unitPriceTTC, 
        vatRate: l.vatRate 
      }))
    });
    await prisma.invoice.update({ where: { id: fresh.id }, data: totals });
  }

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await params;
  // Removed getPrisma() - using direct import

  await prisma.invoiceLine.delete({ where: { id: lineId } });

  const fresh = await prisma.invoice.findUnique({ where: { id }, include: { InvoiceLine: true } }) as InvoiceWithLines | null;
  if (fresh) {
    const totals = recomputeTotals({
      id: fresh.id,
      pricingMode: fresh.pricingMode,
      vatRate: fresh.vatRate,
      discountAmount: fresh.discountAmount || 0,
      lines: (fresh.InvoiceLine || []).map((l) => ({ 
        id: l.id, 
        type: l.type, 
        qty: l.qty, 
        unitPriceHT: l.unitPriceHT, 
        unitPriceTTC: l.unitPriceTTC, 
        vatRate: l.vatRate 
      }))
    });
    await prisma.invoice.update({ where: { id: fresh.id }, data: totals });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
