import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { getAtelierStripeClient } from '@/lib/stripe-atelier';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/finance/invoices/[id]/payment-link
 * Crée un Stripe Payment Link pour cette facture.
 * Idempotent : si la facture a déjà un payment link non utilisé, on le renvoie.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { WorkOrder: { include: { Customer: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
    if (invoice.status === 'draft') {
      return NextResponse.json({ error: 'invoice_not_issued' }, { status: 400 });
    }
    if (invoice.stripePaymentStatus === 'paid') {
      return NextResponse.json({ error: 'already_paid' }, { status: 400 });
    }

    // Renvoie le lien existant s'il y en a un
    if (invoice.stripePaymentLinkUrl && invoice.stripePaymentStatus !== 'failed') {
      return NextResponse.json({
        url: invoice.stripePaymentLinkUrl,
        reused: true,
      });
    }

    let atelier;
    try {
      atelier = await getAtelierStripeClient(userId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'stripe_not_configured';
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const amount = Math.round(invoice.totalTTC * 100); // cents
    if (amount <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    }

    const customer = invoice.WorkOrder?.Customer;
    const customerName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Client'
      : 'Client';

    // 1) Crée un produit + price ad-hoc (Payment Links ont besoin d'un price)
    const product = await atelier.stripe.products.create({
      name: `Facture ${invoice.number || invoice.id} — ${customerName}`,
      metadata: { invoiceId: invoice.id },
    });
    const price = await atelier.stripe.prices.create({
      currency: invoice.currency?.toLowerCase() || 'eur',
      unit_amount: amount,
      product: product.id,
    });

    // 2) Crée le Payment Link
    const link = await atelier.stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { invoiceId: invoice.id, userId },
      payment_intent_data: { metadata: { invoiceId: invoice.id, userId } },
      after_completion: { type: 'hosted_confirmation', hosted_confirmation: { custom_message: 'Merci ! Le paiement de votre facture est confirmé.' } },
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        stripePaymentLinkId: link.id,
        stripePaymentLinkUrl: link.url,
        stripePaymentStatus: 'pending',
      },
    });

    return NextResponse.json({ url: link.url, reused: false, paymentLinkId: link.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[invoice/payment-link] failed', { id, error: msg });
    return NextResponse.json({ error: 'payment_link_failed', detail: msg }, { status: 500 });
  }
}
