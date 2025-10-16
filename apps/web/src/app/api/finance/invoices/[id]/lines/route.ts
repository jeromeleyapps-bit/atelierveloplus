import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { recomputeTotals } from "@/lib/invoice-totals";

export const dynamic = "force-dynamic";

// POST /api/finance/invoices/[id]/lines
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json();
  const inv = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Récupérer le statut auto-entrepreneur
  const firstUser = await prisma.user.findFirst();
  const settings = firstUser 
    ? await prisma.appSetting.findUnique({ where: { userId: firstUser.id } })
    : null;
  const isAutoEntrepreneur = settings?.isAutoEntrepreneur || false;

  // Calculer les totaux de ligne
  const qty = Number(body.qty || 1);
  const vatRate = isAutoEntrepreneur ? 0 : (body.vatRate != null ? Number(body.vatRate) : (inv.vatRate || 20));
  
  let unitPriceHT = 0;
  let unitPriceTTC = 0;
  let totalHT = 0;
  let totalTTC = 0;
  
  // Calcul standard HT + TVA
  unitPriceHT = Number(body.unitPriceHT || 0);
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

  const fresh = await prisma.invoice.findUnique({ where: { id: inv.id }, include: { lines: true } });
  const totals = recomputeTotals({
    id: fresh!.id,
    pricingMode: fresh!.pricingMode,
    vatRate: fresh!.vatRate,
    discountAmount: fresh!.discountAmount || 0,
    lines: fresh!.lines.map(l => ({ id: l.id, type: l.type, qty: l.qty, unitPriceHT: l.unitPriceHT, unitPriceTTC: l.unitPriceTTC, vatRate: l.vatRate }))
  });
  await prisma.invoice.update({ where: { id: inv.id }, data: totals });

  return NextResponse.json(line, { status: 201 });
}
