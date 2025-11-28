import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// List payments for an invoice
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  try {
    const rows = await prisma.invoicePayment.findMany({
      where: { invoiceId: id },
      orderBy: { paidAt: "asc" },
    });
    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    logger.error("[payments][GET] list_payments_failed", { error: message });
    return NextResponse.json({ error: "list_payments_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}

// Create a new partial payment for an invoice
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const method = body.method ? String(body.method) : null;
  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
  const note = body.note ? String(body.note) : null;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  try {
    const created = await prisma.invoicePayment.create({
      data: {
        invoiceId: id,
        amount,
        method,
        paidAt,
        note,
      },
    });
    // Recompute invoice payment status
    try {
      const [inv, list] = await Promise.all([
        prisma.invoice.findUnique({ where: { id: id } }),
        prisma.invoicePayment.findMany({ where: { invoiceId: id } }),
      ]);
      if (inv) {
        const paidSum = list.reduce((s, p) => s + Number(p.amount || 0), 0);
        let newStatus: 'draft' | 'issued' | 'part_paid' | 'paid' | 'cancelled' | undefined;
        if (paidSum >= Number(inv.totalTTC || 0) && Number(inv.totalTTC || 0) > 0) {
          newStatus = 'paid';
        } else if (paidSum > 0) {
          newStatus = 'part_paid';
        } else {
          newStatus = inv.status as 'draft' | 'issued' | 'part_paid' | 'paid' | 'cancelled';
        }
        if (newStatus && newStatus !== inv.status) {
          await prisma.invoice.update({ where: { id: inv.id }, data: { status: newStatus, paidAt: newStatus === 'paid' ? paidAt : null, paymentMethod: newStatus === 'paid' ? method : null } });
        }
      }
    } catch {}
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "create_payment_failed", detail: message }, { status: 500 });
  }
}
