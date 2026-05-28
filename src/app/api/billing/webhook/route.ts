import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripeClient, getWebhookSecret } from '@/lib/stripe';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Stripe envoie le body brut signé via header `stripe-signature`.
 * Pas de body parsing JSON ici — on a besoin du raw.
 */
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  let stripe;
  let secret: string;
  try {
    stripe = getStripeClient();
    secret = getWebhookSecret();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'stripe_not_configured';
    logger.error('[billing/webhook] Stripe not configured', { error: msg });
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[billing/webhook] Signature verification failed', { error: msg });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await markOrderFailedByPaymentIntent(pi.id);
        break;
      }
      default:
        logger.info('[billing/webhook] Unhandled event', { type: event.type });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[billing/webhook] Handler error', { type: event.type, error: msg });
    // 200 quand-même : Stripe retentera si on renvoie >=500, mais ici on a déjà event en DB.
    // Retourne 500 seulement si vraiment besoin de retry.
    return NextResponse.json({ error: 'handler_failed', detail: msg }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (!order) {
    logger.error('[billing/webhook] Order not found for session', { sessionId: session.id });
    return;
  }
  if (order.status === 'paid') {
    logger.info('[billing/webhook] Order already paid (idempotent)', { id: order.id });
    return;
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripePaymentIntentId: paymentIntentId ?? null,
      status: 'paid',
      amount: session.amount_total ?? order.amount,
    },
  });

  // TODO(S2.B) : générer la licence + envoyer l'email — implémenté quand la lib license-generator
  // sera exposée comme module appelable côté serveur (refactor de license-generator/generate-license.js).
  logger.info('[billing/webhook] Order marked paid', { orderId: order.id, tier: order.tier });
}

async function markOrderFailedByPaymentIntent(paymentIntentId: string) {
  await prisma.order.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: 'failed' },
  });
}
