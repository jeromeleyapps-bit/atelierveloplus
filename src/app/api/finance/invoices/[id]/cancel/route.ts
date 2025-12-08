import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { InvoiceLine: true };
}>;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason : null;
  
  const inv = await prisma.invoice.findUnique({ 
    where: { id: id }, 
    include: { InvoiceLine: true } 
  }) as InvoiceWithLines | null;
  
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'cannot_cancel_paid' }, { status: 400 });
  if (inv.status === 'cancelled') return NextResponse.json({ ok: true, invoice: inv }, { status: 200 });
  
  const now = new Date();
  
  // Update invoice and restock parts (IN movements)
  const ops: Array<Prisma.PrismaPromise<unknown>> = [];
  ops.push(prisma.invoice.update({ 
    where: { id: id }, 
    data: { status: 'cancelled', cancelledAt: now, cancelledReason: reason ?? undefined } 
  }));
  
  for (const ln of inv.InvoiceLine || []) {
    if (ln.type === 'part' && ln.partId && ln.qty && ln.qty > 0) {
      const qty = Math.floor(Math.abs(ln.qty));
      ops.push(prisma.stockMovement.create({ 
        data: { itemId: ln.partId, type: 'IN', qty, refType: 'invoice_cancel', refId: inv.id } 
      }));
      ops.push(prisma.catalogItem.update({ 
        where: { id: ln.partId }, 
        data: { stockQty: { increment: qty } } 
      }));
    }
  }
  
  const [updated] = await prisma.$transaction(ops);
  return NextResponse.json(updated, { status: 200 });
}
