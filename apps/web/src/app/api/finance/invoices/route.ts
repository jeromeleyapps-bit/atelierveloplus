import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/finance/invoices
export async function GET(req: Request) {
  try {
    const prisma = await getPrisma();
    if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q");

    const where: any = {};
    if (status) where.status = status;
    if (from || to) where.issueDate = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    // SQLite ne supporte pas mode: 'insensitive', on utilise contains sans mode
    if (q) where.OR = [{ number: { contains: q } }, { workOrderId: { contains: q } }, { id: { contains: q } }];

    const items = await prisma.invoice.findMany({ where, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }] });
    // Enrich with customer info via WorkOrder
    const woIds = Array.from(new Set(items.map(i => i.workOrderId).filter(Boolean)));
    let out = items as any[];
    if (woIds.length > 0) {
      const workOrders = await prisma.workOrder.findMany({ where: { id: { in: woIds } } }) as any[];
      const custIds = Array.from(new Set(workOrders.map((w: any) => w.customerId).filter(Boolean) as string[]));
      const customers = (custIds.length > 0 ? await prisma.customer.findMany({ where: { id: { in: custIds } } }) : []) as any[];
      const custMap = new Map(customers.map((c: any) => [c.id, c] as const));
      const woMap = new Map(workOrders.map((w: any) => [w.id, w] as const));
      out = items.map(i => {
        const wo = woMap.get(i.workOrderId) as any | undefined;
        const c = wo?.customerId ? (custMap.get(wo.customerId) as any | undefined) : undefined;
        const customerName = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || (c.email || '') : undefined;
        return { ...i, customerId: wo?.customerId || null, customerName };
      });
    }
    return NextResponse.json(out, { status: 200 });
  } catch (error: any) {
    console.error('[API /finance/invoices GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/finance/invoices
export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json();
  const {
    workOrderId,
    pricingMode = "HT_TVA",
    currency = "EUR",
    vatRate = pricingMode === "AE_TTC" ? 0 : 20,
    laborRate = 60,
  } = body || {};
  // workOrderId est optionnel (uniquement pour les réparations/services)
  const inv = await prisma.invoice.create({
    data: {
      workOrderId: workOrderId || null,
      type: "invoice", // Type par défaut: facture
      pricingMode,
      currency,
      vatRate,
      laborRate,
      status: "draft",
      subtotalHT: 0,
      vatAmount: 0,
      totalTTC: 0,
    },
  });
  return NextResponse.json(inv, { status: 201 });
}
