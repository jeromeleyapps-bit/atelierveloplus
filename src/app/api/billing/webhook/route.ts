import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripeClient, getWebhookSecret } from '@/lib/stripe';
import sendMail from '@/lib/mailer';
import { logger } from '@/lib/logger';

const PURCHASE_TOKEN_VALIDITY_DAYS = 365;

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

  // Génère un token d'activation à transmettre au client par email.
  // Le client le saisira dans l'app avec son hardware ID pour produire la vraie clé.
  const token = crypto.randomBytes(12).toString('hex').toUpperCase(); // 24 chars
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PURCHASE_TOKEN_VALIDITY_DAYS);

  await prisma.purchaseToken.create({
    data: {
      token,
      orderId: order.id,
      tier: order.tier,
      email: order.customerEmail,
      expiresAt,
    },
  });

  await sendActivationEmail(order.customerEmail, order.tier, token).catch(err => {
    logger.error('[billing/webhook] Activation email failed', { error: String(err) });
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { emailSentAt: new Date() },
  });

  logger.info('[billing/webhook] Order paid + token issued', {
    orderId: order.id,
    tier: order.tier,
    tokenPrefix: token.slice(0, 6),
  });
}

async function sendActivationEmail(email: string, tier: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const activationUrl = `${baseUrl}/admin/license?token=${encodeURIComponent(token)}`;
  const tierLabel = ({
    basique: 'Basique',
    pro: 'Pro',
    pro_lifetime: 'Pro Lifetime',
  } as Record<string, string>)[tier] || tier;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Merci pour ton achat — Atelier Vélo+ ${tierLabel}</h2>
      <p>Voici ton code d'activation. Il est valable 1 an et utilisable une seule fois :</p>
      <p style="font-family:monospace;font-size:20px;background:#f3f4f6;padding:14px;border-radius:8px;letter-spacing:2px;text-align:center">
        ${token}
      </p>
      <p>Pour activer ta licence :</p>
      <ol>
        <li>Ouvre Atelier Vélo+ (ou télécharge-le si ce n'est pas déjà fait).</li>
        <li>Va dans <strong>Paramètres → Licence</strong>.</li>
        <li>Colle ton code dans l'onglet <strong>« Activer un code d'achat »</strong>.</li>
      </ol>
      <p>Tu peux aussi cliquer directement ici depuis le PC où Atelier Vélo+ est installé :
        <a href="${activationUrl}">${activationUrl}</a></p>
      <p style="color:#6b7280;font-size:13px">Si tu n'es pas à l'origine de cet achat, contacte-nous.</p>
    </div>`;

  await sendMail({
    to: email,
    subject: `Ton code d'activation Atelier Vélo+ ${tierLabel}`,
    html,
    text: `Code d'activation : ${token}\nÀ saisir dans Atelier Vélo+ → Paramètres → Licence.`,
  });
}

async function markOrderFailedByPaymentIntent(paymentIntentId: string) {
  await prisma.order.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: 'failed' },
  });
}
