import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { recomputeTotals } from "@/lib/invoice-totals";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string; lineId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json();

  const data: any = {};
  if (body.type != null) data.type = String(body.type);
  if (body.description != null) data.description = String(body.description);
  if (body.qty != null) data.qty = Number(body.qty);
  if (body.unitPriceHT !== undefined) data.unitPriceHT = body.unitPriceHT == null ? null : Number(body.unitPriceHT);
  if (body.unitPriceTTC !== undefined) data.unitPriceTTC = body.unitPriceTTC == null ? null : Number(body.unitPriceTTC);
  if (body.vatRate !== undefined) data.vatRate = body.vatRate == null ? null : Number(body.vatRate);
  if (body.partId !== undefined) data.partId = body.partId == null ? null : String(body.partId);
  if (body.purchasePriceHT !== undefined) data.purchasePriceHT = body.purchasePriceHT == null ? null : Number(body.purchasePriceHT);

  const updated = await prisma.invoiceLine.update({ where: { id: params.lineId }, data });

  // recompute totals
  const fresh = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: true } });
  if (fresh) {
    const totals = recomputeTotals({
      id: fresh.id,
      pricingMode: fresh.pricingMode,
      vatRate: fresh.vatRate,
      discountAmount: fresh.discountAmount || 0,
      lines: fresh.lines.map(l => ({ id: l.id, type: l.type, qty: l.qty, unitPriceHT: l.unitPriceHT, unitPriceTTC: l.unitPriceTTC, vatRate: l.vatRate }))
    });
    await prisma.invoice.update({ where: { id: fresh.id }, data: totals });
  }

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string; lineId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  await prisma.invoiceLine.delete({ where: { id: params.lineId } });

  const fresh = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: true } });
  if (fresh) {
    const totals = recomputeTotals({
      id: fresh.id,
      pricingMode: fresh.pricingMode,
      vatRate: fresh.vatRate,
      discountAmount: fresh.discountAmount || 0,
      lines: fresh.lines.map(l => ({ id: l.id, type: l.type, qty: l.qty, unitPriceHT: l.unitPriceHT, unitPriceTTC: l.unitPriceTTC, vatRate: l.vatRate }))
    });
    await prisma.invoice.update({ where: { id: fresh.id }, data: totals });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
