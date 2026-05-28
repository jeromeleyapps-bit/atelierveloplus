import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnectClientId, getStripeMode } from '@/lib/stripe';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Démarre le flow OAuth Stripe Connect : génère un state CSRF, le pose en cookie,
 * et renvoie l'URL d'autorisation Stripe.
 */
export async function POST(req: Request) {
  const userId = await getUserIdOrFirst(req);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let clientId: string;
  try {
    clientId = getConnectClientId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'connect_not_configured';
    logger.error('[stripe/connect] Connect not configured', { error: msg });
    return NextResponse.json({ error: 'connect_not_configured', detail: msg }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${baseUrl}/api/integrations/stripe/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: redirectUri,
    state,
    // 'stripe_user[email]': pré-rempli optionnel — laissé vide pour que Stripe le demande
  });

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

  const res = NextResponse.json({ url, mode: getStripeMode() });
  res.cookies.set('stripe_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  res.cookies.set('stripe_oauth_user', userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
