import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { generateCreditNoteNumber } from "@/lib/invoice-number";

export const dynamic = "force-dynamic";

/**
 * POST /api/finance/invoices/[id]/credit
 * Create a credit note (avoir) for an invoice
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  const src = await prisma.invoice.findUnique({ 
    where: { id: params.id }, 
    include: { lines: true } 
  });
  
  if (!src) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
  if (src.status === 'cancelled') return NextResponse.json({ error: 'source_cancelled' }, { status: 400 });
  if (src.type === 'credit') return NextResponse.json({ error: 'cannot_credit_credit' }, { status: 400 });

  // Generate credit note number using atomic sequence
  const creditNumber = await generateCreditNoteNumber();
  const issueDate = new Date();

  // Create credit invoice with mirrored negative lines
  const created = await prisma.invoice.create({
    data: {
      workOrderId: src.workOrderId,
      type: 'credit',
      parentId: src.id,
      status: 'issued',
      number: creditNumber,
      issueDate,
      pricingMode: src.pricingMode,
      currency: src.currency,
      vatRate: src.vatRate,
      laborRate: src.laborRate,
      discountAmount: src.discountAmount ? Math.abs(src.discountAmount) * -1 : 0,
      subtotalHT: (src.subtotalHT || 0) * -1,
      vatAmount: (src.vatAmount || 0) * -1,
      totalTTC: (src.totalTTC || 0) * -1,
      lines: {
        create: src.lines.map((l: any) => ({
          type: l.type,
          description: `AVOIR - ${l.description}`.slice(0, 200),
          qty: -Math.abs(l.qty || 0),
          unitPriceHT: l.unitPriceHT != null ? Math.abs(l.unitPriceHT) : null,
          unitPriceTTC: l.unitPriceTTC != null ? Math.abs(l.unitPriceTTC) : null,
          vatRate: l.vatRate != null ? l.vatRate : src.vatRate,
          totalHT: -(l.totalHT || 0),
          totalTTC: -(l.totalTTC || 0),
          partId: l.partId || null,
          purchasePriceHT: l.purchasePriceHT || null,
        })),
      },
    },
    include: { lines: true },
  });

  // Restock parts for credit (assuming return of goods)
  const ops: any[] = [];
  for (const ln of created.lines || []) {
    if ((ln as any).type === 'part' && (ln as any).partId && (ln as any).qty && (ln as any).qty < 0) {
      const qty = Math.floor(Math.abs((ln as any).qty));
      ops.push(prisma.stockMovement.create({ data: { itemId: (ln as any).partId!, type: 'IN', qty, refType: 'invoice_credit', refId: created.id } }));
      ops.push(prisma.catalogItem.update({ where: { id: (ln as any).partId! }, data: { stockQty: { increment: qty } } }));
    }
  }
  if (ops.length) await prisma.$transaction(ops);

  return NextResponse.json(created, { status: 201 });
}
