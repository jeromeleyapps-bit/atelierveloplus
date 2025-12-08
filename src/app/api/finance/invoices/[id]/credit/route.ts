import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCreditNoteNumber } from "@/lib/invoice-number";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Type pour Invoice avec lignes incluses
type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { InvoiceLine: true };
}>;

/**
 * POST /api/finance/invoices/[id]/credit
 * Create a credit note (avoir) for an invoice
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  
  const src = await prisma.invoice.findUnique({ 
    where: { id: id }, 
    include: { InvoiceLine: true } 
  }) as InvoiceWithLines | null;
  
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
      InvoiceLine: { create: src.InvoiceLine.map((l) => ({
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
    include: { InvoiceLine: true },
  }) as InvoiceWithLines;

  // Restock parts for credit (assuming return of goods)
  const ops: Array<Prisma.PrismaPromise<unknown>> = [];
  for (const ln of created.InvoiceLine || []) {
    if (ln.type === 'part' && ln.partId && ln.qty && ln.qty < 0) {
      const qty = Math.floor(Math.abs(ln.qty));
      ops.push(prisma.stockMovement.create({ data: { itemId: ln.partId, type: 'IN', qty, refType: 'invoice_credit', refId: created.id } }));
      ops.push(prisma.catalogItem.update({ where: { id: ln.partId }, data: { stockQty: { increment: qty } } }));
    }
  }
  if (ops.length) await prisma.$transaction(ops);

  return NextResponse.json(created, { status: 201 });
}
