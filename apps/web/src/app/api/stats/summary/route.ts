import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseDateParam(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const { searchParams } = new URL(req.url);
  const from = parseDateParam(searchParams.get("from"));
  const to = parseDateParam(searchParams.get("to"));

  // Invoices KPIs
  const invoices = await prisma.invoice.findMany({});
  const inRange = invoices.filter((i) => {
    const d = i.issueDate ? new Date(i.issueDate) : i.createdAt;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  const countIssued = invoices.filter(i => i.status === 'issued').length;
  const countPaid = invoices.filter(i => i.status === 'paid').length;
  const sumAll = invoices.reduce((s, i) => s + (i.totalTTC || 0), 0);
  const sumInRange = inRange.reduce((s, i) => s + (i.totalTTC || 0), 0);
  const sumPaidInRange = inRange.filter(i => i.status === 'paid').reduce((s, i) => s + (i.totalTTC || 0), 0);

  // Work orders KPIs (approx): delivered within range via dueAt or createdAt fallback
  const workOrders = await prisma.workOrder.findMany({});
  const deliveredInRange = workOrders.filter((w) => {
    if (w.status !== 'delivered') return false;
    const d = w.dueAt ?? w.createdAt;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }).length;

  return NextResponse.json({
    invoices: {
      totalCount: invoices.length,
      issuedCount: countIssued,
      paidCount: countPaid,
      totalAmount: sumAll,
      range: {
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        count: inRange.length,
        totalAmount: sumInRange,
        paidAmount: sumPaidInRange,
      },
    },
    workOrders: {
      deliveredInRange,
    },
  }, { status: 200 });
}
