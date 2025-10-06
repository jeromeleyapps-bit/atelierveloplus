import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const rows = await prisma.stockMovement.findMany({ where: { itemId: params.id }, orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').toUpperCase();
  const qty = Number(body.qty || 0);
  const refType = body.refType ? String(body.refType) : undefined;
  const refId = body.refId ? String(body.refId) : undefined;
  const note = body.note ? String(body.note) : undefined;
  if (!['IN','OUT','ADJUST'].includes(type) || !Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const item = await prisma.catalogItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

  const delta = type === 'IN' ? qty : type === 'OUT' ? -qty : 0; // ADJUST handled as direct movement without stock change? we keep log and adjust separately below
  let newQty = item.stockQty + delta;
  if (type === 'ADJUST') newQty = qty; // for ADJUST, qty means new absolute stock level

  const [created] = await prisma.$transaction([
    prisma.stockMovement.create({ data: { itemId: item.id, type, qty, refType, refId, note } }),
    prisma.catalogItem.update({ where: { id: item.id }, data: { stockQty: newQty } }),
  ]);

  return NextResponse.json(created, { status: 201 });
}
