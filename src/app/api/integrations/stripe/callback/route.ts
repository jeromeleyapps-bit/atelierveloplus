import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient, getStripeMode } from '@/lib/stripe';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieState = (req.headers.get('cookie') || '')
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('stripe_oauth_state='))
    ?.split('=')[1];
  const cookieUser = (req.headers.get('cookie') || '')
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('stripe_oauth_user='))
    ?.split('=')[1];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const settingsUrl = `${baseUrl}/admin/integrations/stripe`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(error)}`);
  }
  if (!code || !state || !cookieState || state !== cookieState || !cookieUser) {
    return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
  }

  try {
    const stripe = getStripeClient();
    const tokenRes = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    if (!tokenRes.stripe_user_id) {
      throw new Error('missing_stripe_user_id');
    }

    await prisma.stripeConnection.upsert({
      where: { userId: cookieUser },
      create: {
        userId: cookieUser,
        stripeAccountId: tokenRes.stripe_user_id,
        accessToken: tokenRes.access_token ?? null,
        refreshToken: tokenRes.refresh_token ?? null,
        livemode: tokenRes.livemode ?? getStripeMode() === 'live',
        scope: tokenRes.scope ?? null,
        status: 'active',
      },
      update: {
        stripeAccountId: tokenRes.stripe_user_id,
        accessToken: tokenRes.access_token ?? null,
        refreshToken: tokenRes.refresh_token ?? null,
        livemode: tokenRes.livemode ?? getStripeMode() === 'live',
        scope: tokenRes.scope ?? null,
        status: 'active',
        updatedAt: new Date(),
      },
    });

    const res = NextResponse.redirect(`${settingsUrl}?connected=1`);
    res.cookies.delete('stripe_oauth_state');
    res.cookies.delete('stripe_oauth_user');
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[stripe/callback] OAuth exchange failed', { error: msg });
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
  }
}
