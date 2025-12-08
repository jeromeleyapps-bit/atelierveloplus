import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {  const { id, paymentId } = await params;

  // Removed getPrisma() - using direct import
  try {
    // Ensure it belongs to the invoice
    const pay = await prisma.invoicePayment.findUnique({ where: { id: paymentId } });
    if (!pay || pay.invoiceId !== id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.invoicePayment.delete({ where: { id: paymentId } });

    // Recompute invoice payment status after deletion
    try {
      const [inv, list] = await Promise.all([
        prisma.invoice.findUnique({ where: { id: id } }),
        prisma.invoicePayment.findMany({ where: { invoiceId: id } }),
      ]);
      if (inv) {
        const paidSum = list.reduce((s, p) => s + Number(p.amount || 0), 0);
        const total = Number(inv.totalTTC || 0);
        // Définition du type pour le statut de la facture
        type InvoiceStatus = 'draft' | 'issued' | 'part_paid' | 'paid' | 'cancelled';
        let newStatus: InvoiceStatus;
        
        if (paidSum >= total && total > 0) {
          newStatus = 'paid';
        } else if (paidSum > 0) {
          newStatus = 'part_paid';
        } else {
          // Vérification du type du statut actuel
          const currentStatus = inv.status as InvoiceStatus;
          newStatus = (currentStatus === 'paid' || currentStatus === 'part_paid') ? 'issued' : currentStatus;
        }

        if (newStatus && newStatus !== inv.status) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { status: newStatus, paidAt: newStatus === 'paid' ? (list[list.length-1]?.paidAt ?? null) : null, paymentMethod: newStatus === 'paid' ? (list[list.length-1]?.method ?? null) : null },
          });
        }
      }
    } catch {}

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'delete_payment_failed', detail: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const data: Prisma.InvoicePaymentUpdateInput = {};
  if (body.amount != null) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    data.amount = amount;
  }
  if (body.method !== undefined) data.method = body.method ? String(body.method) : null;
  if (body.paidAt !== undefined) data.paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
  if (body.note !== undefined) data.note = body.note ? String(body.note) : null;

  try {
    // Ensure belongs to invoice
    const pay = await prisma.invoicePayment.findUnique({ where: { id: paymentId } });
    if (!pay || pay.invoiceId !== id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.invoicePayment.update({ where: { id: paymentId }, data });

    // Recompute invoice status
    try {
      const [inv, list] = await Promise.all([
        prisma.invoice.findUnique({ where: { id: id } }),
        prisma.invoicePayment.findMany({ where: { invoiceId: id } }),
      ]);
      if (inv) {
        const paidSum = list.reduce((s, p) => s + Number(p.amount || 0), 0);
        const total = Number(inv.totalTTC || 0);
        // Définition du type pour le statut de la facture
        type InvoiceStatus = 'draft' | 'issued' | 'part_paid' | 'paid' | 'cancelled';
        let newStatus: InvoiceStatus;
        
        if (paidSum >= total && total > 0) {
          newStatus = 'paid';
        } else if (paidSum > 0) {
          newStatus = 'part_paid';
        } else {
          // Vérification du type du statut actuel
          const currentStatus = inv.status as InvoiceStatus;
          newStatus = (currentStatus === 'paid' || currentStatus === 'part_paid') ? 'issued' : currentStatus;
        }
        if (newStatus && newStatus !== inv.status) {
          // pick last payment for paidAt/method
          const last = list.sort((a,b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime())[list.length-1];
          await prisma.invoice.update({ where: { id: inv.id }, data: { status: newStatus, paidAt: newStatus === 'paid' ? (last?.paidAt ?? null) : null, paymentMethod: newStatus === 'paid' ? (last?.method ?? null) : null } });
        }
      }
    } catch {}

    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'update_payment_failed', detail: message }, { status: 500 });
  }
}
