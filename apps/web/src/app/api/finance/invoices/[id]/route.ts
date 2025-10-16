import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { recomputeTotals } from "@/lib/invoice-totals";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  try {
    const row = await prisma.invoice.findUnique({ 
      where: { id: params.id }, 
      include: { 
        lines: true,
        payments: true,
      } 
    });
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    
    // Récupérer le statut auto-entrepreneur
    const firstUser = await prisma.user.findFirst();
    const settings = firstUser 
      ? await prisma.appSetting.findUnique({ where: { userId: firstUser.id } })
      : null;
    const isAutoEntrepreneur = settings?.isAutoEntrepreneur || false;
    
    // Forcer TVA à 0 si auto-entrepreneur
    if (isAutoEntrepreneur) {
      // Forcer TVA à 0 dans les lignes
      if (row.lines) {
        row.lines = row.lines.map((line: any) => ({
          ...line,
          vatRate: 0,
        }));
      }
      
      // Forcer les totaux de l'invoice
      (row as any).vatAmount = 0;
      (row as any).totalTTC = row.subtotalHT;
    }
    
    // Charger le WorkOrder séparément avec le customer
    let workOrder = null;
    let workOrderType = null;
    if (row.workOrderId) {
      workOrder = await prisma.workOrder.findUnique({ 
        where: { id: row.workOrderId },
        include: { customer: true }
      });
      workOrderType = workOrder?.type || null;
    }
    
    return NextResponse.json({ ...row, workOrder, workOrderType }, { status: 200 });
  } catch (e: any) {
    console.error("Error fetching invoice:", e);
    return NextResponse.json({ error: e.message || "fetch_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json();
  const updated = await prisma.invoice.update({ where: { id: params.id }, data: body });
  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  try {
    // Supprimer d'abord les lignes de facture
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: params.id } });
    
    // Supprimer les paiements associés
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: params.id } });
    
    // Supprimer la facture
    await prisma.invoice.delete({ where: { id: params.id } });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
