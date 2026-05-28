import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient, getStripeMode, getPriceIdForTier, PRICING_TIERS } from '@/lib/stripe';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIERS = PRICING_TIERS.map(p => p.tier);

export async function POST(req: Request) {
  try {
    const { tier, email } = await req.json();

    if (!tier || !TIERS.includes(tier)) {
      return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    let stripe;
    let priceId: string;
    try {
      stripe = getStripeClient();
      priceId = getPriceIdForTier(tier);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'stripe_not_configured';
      logger.error('[billing/checkout] Stripe not configured', { error: msg });
      return NextResponse.json(
        { error: 'stripe_not_configured', detail: msg },
        { status: 503 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: tier === 'pro_lifetime' ? 'payment' : 'payment', // achats perpétuels = paiement unique
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${baseUrl}/tarifs/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/tarifs?cancelled=1`,
      metadata: { tier },
      payment_intent_data: { metadata: { tier, email } },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'no_session_url' }, { status: 502 });
    }

    await prisma.order.create({
      data: {
        stripeCheckoutSessionId: session.id,
        stripeMode: getStripeMode(),
        customerEmail: email,
        tier,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'eur',
        status: 'pending',
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[billing/checkout] Error', { error: msg });
    return NextResponse.json({ error: 'checkout_failed', detail: msg }, { status: 500 });
  }
}
