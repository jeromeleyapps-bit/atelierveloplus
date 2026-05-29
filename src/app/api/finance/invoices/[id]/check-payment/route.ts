import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { getAtelierStripeClient } from '@/lib/stripe-atelier';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/finance/invoices/[id]/check-payment
 * Interroge Stripe pour savoir si la facture a été payée.
 * Met à jour stripePaymentStatus et paidAt en conséquence.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
    if (!invoice.stripePaymentLinkId) {
      return NextResponse.json({ status: 'no_link' });
    }
    if (invoice.stripePaymentStatus === 'paid') {
      return NextResponse.json({ status: 'paid', paidAt: invoice.stripePaidAt });
    }

    let atelier;
    try {
      atelier = await getAtelierStripeClient(userId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'stripe_not_configured';
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    // Cherche les sessions Checkout / PaymentIntents avec metadata.invoiceId == id
    const sessions = await atelier.stripe.checkout.sessions.list({
      payment_link: invoice.stripePaymentLinkId,
      limit: 10,
    });
    const paidSession = sessions.data.find(s => s.payment_status === 'paid');
    if (!paidSession) {
      return NextResponse.json({ status: 'pending' });
    }

    const piId = typeof paidSession.payment_intent === 'string'
      ? paidSession.payment_intent
      : paidSession.payment_intent?.id ?? null;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        stripePaymentStatus: 'paid',
        stripePaymentIntentId: piId,
        stripePaidAt: new Date(),
        paidAt: invoice.paidAt ?? new Date(),
        paymentMethod: invoice.paymentMethod ?? 'stripe',
        status: invoice.status === 'issued' ? 'paid' : invoice.status,
      },
    });

    return NextResponse.json({ status: 'paid', paidAt: new Date().toISOString(), paymentIntentId: piId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[invoice/check-payment] failed', { id, error: msg });
    return NextResponse.json({ error: 'check_failed', detail: msg }, { status: 500 });
  }
}
