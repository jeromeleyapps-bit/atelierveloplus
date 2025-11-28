import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * POST /api/finance/invoices/[id]/issue
 * Issue an invoice: assign number, set status to issued, create stock movements
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  
  const now = new Date();
  
  // Get current invoice with lines
  const current = await prisma.invoice.findUnique({ 
    where: { id: id }, 
    include: { InvoiceLine: true } 
  });
  
  if (!current) {
    return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
  }

  // Check if already issued
  if (current.status === 'issued' && current.number) {
    return NextResponse.json(current, { status: 200 });
  }

  try {
    // Generate invoice number using atomic sequence with correct type
    const documentType = (current.type as 'invoice' | 'quote' | 'credit') || 'invoice';
    const invoiceNumber = await generateInvoiceNumber(documentType);

    // Prepare transaction operations
    const ops: any[] = [];

    // 1. Update invoice to issued
    ops.push(
      prisma.invoice.update({ 
        where: { id: id }, 
        data: { 
          status: 'issued', 
          issueDate: now, 
          number: invoiceNumber 
        } 
      })
    );

    // 2. Create stock OUT movements for part lines
    for (const line of (current.InvoiceLine || [])) {
      if (line.type === 'part' && line.partId && line.qty > 0) {
        const qty = Math.floor(Math.abs(line.qty));
        
        // Create stock movement
        ops.push(
          prisma.stockMovement.create({ 
            data: { 
              itemId: line.partId, 
              type: 'OUT', 
              qty, 
              refType: 'invoice', 
              refId: current.id,
              note: `Facture ${invoiceNumber}`,
            } 
          })
        );

        // Decrement stock
        ops.push(
          prisma.catalogItem.update({ 
            where: { id: line.partId }, 
            data: { stockQty: { decrement: qty } } 
          })
        );
      }
    }

    // Execute all operations in transaction
    const [updatedInvoice] = await prisma.$transaction(ops);

    return NextResponse.json(updatedInvoice, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Invoice issue error', { error: message });
    return NextResponse.json({ 
      error: 'invoice_issue_failed', 
      detail: message
    }, { status: 500 });
  }
}
