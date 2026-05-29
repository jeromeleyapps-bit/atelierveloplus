import { Router } from 'itty-router';
import Stripe from 'stripe';
import type { Env } from './env';
import { generateLicense, type Tier } from './license';
import { sendActivationEmail } from './email';

const PURCHASE_TOKEN_VALIDITY_DAYS = 365;
const TIERS: Tier[] = ['basique', 'pro', 'pro_lifetime'];

const router = Router();

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
  });
}

function priceIdForTier(env: Env, tier: Tier): string {
  if (tier === 'basique') return env.STRIPE_PRICE_BASIQUE;
  if (tier === 'pro') return env.STRIPE_PRICE_PRO;
  if (tier === 'pro_lifetime') return env.STRIPE_PRICE_PRO_LIFETIME;
  throw new Error(`unknown_tier_${tier}`);
}

function stripeMode(secretKey: string): 'test' | 'live' {
  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

router.options('*', () => new Response(null, { headers: corsHeaders }));

// POST /billing/checkout  { tier, email } → { url }
router.post('/billing/checkout', async (request: Request, env: Env) => {
  try {
    const { tier, email } = await request.json<{ tier: string; email: string }>();
    if (!TIERS.includes(tier as Tier)) return json({ error: 'invalid_tier' }, { status: 400 });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'invalid_email' }, { status: 400 });

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceIdForTier(env, tier as Tier), quantity: 1 }],
      customer_email: email,
      success_url: `${env.APP_PUBLIC_URL.replace(/\/$/, '')}/tarifs/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_PUBLIC_URL.replace(/\/$/, '')}/tarifs?cancelled=1`,
      metadata: { tier },
      payment_intent_data: { metadata: { tier, email } },
    });

    if (!session.url) return json({ error: 'no_session_url' }, { status: 502 });

    const id = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO orders (id, stripe_checkout_session_id, stripe_mode, customer_email, tier, amount, currency, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(id, session.id, stripeMode(env.STRIPE_SECRET_KEY), email, tier, session.amount_total ?? 0, session.currency ?? 'eur').run();

    return json({ url: session.url, sessionId: session.id });
  } catch (e) {
    return json({ error: 'checkout_failed', detail: String(e) }, { status: 500 });
  }
});

// GET /billing/order-status?session_id=…
router.get('/billing/order-status', async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) return json({ error: 'missing_session_id' }, { status: 400 });
  const row = await env.DB
    .prepare('SELECT status, customer_email, tier FROM orders WHERE stripe_checkout_session_id = ?')
    .bind(sessionId)
    .first<{ status: string; customer_email: string; tier: string }>();
  if (!row) return json({ status: 'unknown' }, { status: 404 });
  return json({ status: row.status, customerEmail: row.customer_email, tier: row.tier });
});

// POST /billing/webhook  (signature Stripe vérifiée)
router.post('/billing/webhook', async (request: Request, env: Env) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return json({ error: 'missing_signature' }, { status: 400 });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return json({ error: 'invalid_signature', detail: String(e) }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(env, session);
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await env.DB.prepare(`UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE stripe_payment_intent_id = ?`)
        .bind(pi.id).run();
    }
    return json({ received: true });
  } catch (e) {
    return json({ error: 'handler_failed', detail: String(e) }, { status: 500 });
  }
});

async function handleCheckoutCompleted(env: Env, session: Stripe.Checkout.Session): Promise<void> {
  const order = await env.DB
    .prepare('SELECT * FROM orders WHERE stripe_checkout_session_id = ?')
    .bind(session.id)
    .first<{ id: string; status: string; tier: string; customer_email: string; amount: number }>();
  if (!order) throw new Error('order_not_found');
  if (order.status === 'paid') return;

  const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
  await env.DB.prepare(`
    UPDATE orders
    SET stripe_payment_intent_id = ?, status = 'paid', amount = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(piId, session.amount_total ?? order.amount, order.id).run();

  const token = randomToken(12);
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + PURCHASE_TOKEN_VALIDITY_DAYS);
  const tokenId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO purchase_tokens (id, token, order_id, tier, email, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(tokenId, token, order.id, order.tier, order.customer_email, expiresAt.toISOString()).run();

  await sendActivationEmail(env, order.customer_email, order.tier, token);

  await env.DB.prepare(`UPDATE orders SET email_sent_at = datetime('now') WHERE id = ?`).bind(order.id).run();
}

function randomToken(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// POST /license/redeem  { token, hardwareId } → { licenseKey, … }
router.post('/license/redeem', async (request: Request, env: Env) => {
  try {
    const { token, hardwareId } = await request.json<{ token: string; hardwareId: string }>();
    if (typeof token !== 'string' || token.length < 8) return json({ error: 'invalid_token' }, { status: 400 });
    if (typeof hardwareId !== 'string' || hardwareId.length < 16) return json({ error: 'invalid_hardware_id' }, { status: 400 });

    const normalized = token.trim().toUpperCase();
    const row = await env.DB
      .prepare('SELECT * FROM purchase_tokens WHERE token = ?')
      .bind(normalized)
      .first<{ id: string; tier: string; expires_at: string; redeemed_at: string | null; license_key: string | null; hardware_id: string | null; order_id: string }>();

    if (!row) return json({ error: 'token_not_found' }, { status: 404 });
    if (new Date(row.expires_at) < new Date()) return json({ error: 'token_expired' }, { status: 410 });
    if (!TIERS.includes(row.tier as Tier)) return json({ error: 'invalid_tier_stored' }, { status: 500 });

    const hwidNorm = hardwareId.substring(0, 16).toUpperCase();
    if (row.redeemed_at && row.license_key) {
      if (row.hardware_id === hwidNorm) {
        return json({ ok: true, alreadyRedeemed: true, licenseKey: row.license_key, tier: row.tier });
      }
      return json({ error: 'token_already_used_other_machine' }, { status: 409 });
    }

    const license = await generateLicense(row.tier as Tier, hardwareId, env.LICENSE_PRIVATE_KEY_PEM);

    await env.DB.prepare(`
      UPDATE purchase_tokens
      SET redeemed_at = datetime('now'), license_key = ?, hardware_id = ?
      WHERE id = ?
    `).bind(license.key, license.hardwareId, row.id).run();

    await env.DB.prepare(`UPDATE orders SET license_key = ? WHERE id = ?`)
      .bind(license.key, row.order_id).run();

    return json({
      ok: true,
      licenseKey: license.key,
      tier: license.tier,
      expiryDate: license.expiryDate?.toISOString() ?? null,
    });
  } catch (e) {
    return json({ error: 'redeem_failed', detail: String(e) }, { status: 500 });
  }
});

router.all('*', () => json({ error: 'not_found' }, { status: 404 }));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.fetch(request, env);
  },
};
