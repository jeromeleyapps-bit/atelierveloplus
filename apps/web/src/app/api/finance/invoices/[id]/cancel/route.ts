import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({} as any));
  const reason = typeof body.reason === 'string' ? body.reason : null;
  const inv = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: true } as any } as any);
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'cannot_cancel_paid' }, { status: 400 });
  if (inv.status === 'cancelled') return NextResponse.json({ ok: true, invoice: inv }, { status: 200 });
  const now = new Date();
  // Update invoice and restock parts (IN movements)
  const ops: any[] = [];
  ops.push(prisma.invoice.update({ where: { id: params.id }, data: { status: 'cancelled', cancelledAt: now, cancelledReason: reason ?? undefined } }));
  for (const ln of (inv as any).lines || []) {
    if ((ln as any).type === 'part' && (ln as any).partId && (ln as any).qty && (ln as any).qty > 0) {
      const qty = Math.floor(Math.abs((ln as any).qty));
      ops.push(prisma.stockMovement.create({ data: { itemId: (ln as any).partId!, type: 'IN', qty, refType: 'invoice_cancel', refId: inv.id } }));
      ops.push(prisma.catalogItem.update({ where: { id: (ln as any).partId! }, data: { stockQty: { increment: qty } } }));
    }
  }
  const [updated] = await prisma.$transaction(ops);
  return NextResponse.json(updated, { status: 200 });
}
