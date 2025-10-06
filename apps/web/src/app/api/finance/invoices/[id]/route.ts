import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { recomputeTotals } from "@/lib/invoice-totals";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const row = await prisma.invoice.findUnique({ where: { id: params.id }, include: { lines: true } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  
  // Enrichir avec le type du WorkOrder
  let workOrderType = null;
  if (row.workOrderId) {
    const wo = await prisma.workOrder.findUnique({ 
      where: { id: row.workOrderId },
      select: { type: true }
    });
    workOrderType = wo?.type || null;
  }
  
  return NextResponse.json({ ...row, workOrderType }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json();
  const updated = await prisma.invoice.update({ where: { id: params.id }, data: body });
  return NextResponse.json(updated, { status: 200 });
}
