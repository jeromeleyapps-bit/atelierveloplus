import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { recomputeTotals } from "@/lib/invoice-totals";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Type pour Invoice avec lignes et paiements inclus
type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { InvoiceLine: true; InvoicePayment: true };
}>;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  
  try {
    const row = await prisma.invoice.findUnique({ 
      where: { id }, 
      include: { 
        InvoiceLine: true,
        InvoicePayment: true,
      } 
    }) as InvoiceWithLines | null;
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    
    // Récupérer le statut auto-entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();
    
    // Forcer TVA à 0 si auto-entrepreneur
    if (isAutoEntrepreneur) {
      // Forcer TVA à 0 dans les lignes
      if (row.InvoiceLine) {
        row.InvoiceLine = row.InvoiceLine.map((line) => ({
          ...line,
          vatRate: 0,
        }));
      }
      
      // Forcer les totaux de l'invoice
      row.vatAmount = 0;
      row.totalTTC = row.subtotalHT;
    }
    
    // Charger le WorkOrder séparément avec le customer
    let workOrder = null;
    let workOrderType = null;
    if (row.workOrderId) {
      workOrder = await prisma.workOrder.findUnique({ 
        where: { id: row.workOrderId },
        include: { Customer: true }
      });
      workOrderType = workOrder?.type || null;
    }
    
    // ✅ FIX: Transformer InvoiceLine en lines pour correspondre au type attendu par le frontend
    const { InvoiceLine, InvoicePayment, ...invoiceData } = row;
    const response = {
      ...invoiceData,
      lines: (InvoiceLine || []).map((line) => ({
        id: line.id,
        invoiceId: line.invoiceId,
        type: line.type,
        description: line.description,
        qty: line.qty,
        unitPriceHT: line.unitPriceHT,
        unitPriceTTC: line.unitPriceTTC,
        vatRate: line.vatRate,
        totalHT: line.totalHT,
        totalTTC: line.totalTTC,
        sourceId: line.partId,
        duration: line.type === 'service' ? 0 : undefined, // duration n'existe pas dans InvoiceLine
      })),
      payments: InvoicePayment || [],
      workOrder,
      workOrderType,
    };
    
    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    logger.error("Error fetching invoice:", e);
    const message = e instanceof Error ? e.message : "fetch_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  
  // Récupérer le statut auto-entrepreneur
  const isAutoEntrepreneur = await getIsAutoEntrepreneur();
  
  const body = await req.json();
  
  // Si auto-entrepreneur, forcer TVA à 0
  if (isAutoEntrepreneur) {
    if (body.vatRate !== undefined) body.vatRate = 0;
    if (body.vatAmount !== undefined) body.vatAmount = 0;
    if (body.subtotalHT !== undefined && body.totalTTC === undefined) {
      body.totalTTC = body.subtotalHT; // TTC = HT pour AE
    }
  }
  
  const updated = await prisma.invoice.update({ 
    where: { id }, 
    data: body,
    include: { InvoiceLine: true } // Inclure lignes pour recalcul
  }) as InvoiceWithLines;
  
  // Recalculer totaux après mise à jour
  const invoiceWithLines: any = {
    ...updated,
    lines: updated.InvoiceLine
  };
  const recomputed = recomputeTotals(invoiceWithLines);
  
  // Sauvegarder totaux recalculés
  if (recomputed) {
    await prisma.invoice.update({
      where: { id },
      data: {
        subtotalHT: recomputed.subtotalHT,
        vatAmount: recomputed.vatAmount,
        totalTTC: recomputed.totalTTC,
      }
    });
  }
  
  return NextResponse.json(recomputed || updated, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  
  try {
    // Supprimer d'abord les lignes de facture
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
    
    // Supprimer les paiements associés
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: id } });
    
    // Supprimer la facture
    await prisma.invoice.delete({ where: { id } });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    logger.error('[DELETE Invoice] Error:', e);
    const message = e instanceof Error ? e.message : 'delete_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
