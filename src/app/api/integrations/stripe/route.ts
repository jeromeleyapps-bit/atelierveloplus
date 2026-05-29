import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { encrypt } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface StoredConnection {
  publishableKey: string;
  accountLabel: string | null;
  livemode: boolean;
  status: string;
  connectedAt: Date;
  updatedAt: Date;
}

function publicShape(c: StoredConnection | null) {
  if (!c) return null;
  return {
    publishableKey: c.publishableKey,
    accountLabel: c.accountLabel,
    livemode: c.livemode,
    status: c.status,
    connectedAt: c.connectedAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const conn = await prisma.stripeConnection.findUnique({
    where: { userId },
    select: {
      publishableKey: true,
      accountLabel: true,
      livemode: true,
      status: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ connection: publicShape(conn) });
}

/**
 * POST { publishableKey, secretKey, accountLabel? }
 * Valide les clés en interrogeant Stripe puis persiste secret chiffré.
 */
export async function POST(req: Request) {
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { publishableKey, secretKey, accountLabel } = await req.json();
    if (typeof publishableKey !== 'string' || !/^pk_(test|live)_/.test(publishableKey)) {
      return NextResponse.json({ error: 'invalid_publishable_key' }, { status: 400 });
    }
    if (typeof secretKey !== 'string' || !/^(sk|rk)_(test|live)_/.test(secretKey)) {
      return NextResponse.json({ error: 'invalid_secret_key' }, { status: 400 });
    }

    const pkLive = publishableKey.startsWith('pk_live_');
    const skLive = /^(sk|rk)_live_/.test(secretKey);
    if (pkLive !== skLive) {
      return NextResponse.json({ error: 'mode_mismatch' }, { status: 400 });
    }

    // Validation Stripe : un appel léger pour confirmer la clé.
    const stripe = new Stripe(secretKey);
    try {
      await stripe.balance.retrieve();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn('[stripe-keys] validation failed', { error: msg });
      return NextResponse.json({ error: 'stripe_rejected', detail: msg }, { status: 400 });
    }

    const secretKeyEncrypted = encrypt(secretKey);

    const saved = await prisma.stripeConnection.upsert({
      where: { userId },
      create: {
        userId,
        publishableKey,
        secretKeyEncrypted,
        accountLabel: accountLabel || null,
        livemode: skLive,
        status: 'active',
      },
      update: {
        publishableKey,
        secretKeyEncrypted,
        accountLabel: accountLabel || null,
        livemode: skLive,
        status: 'active',
        updatedAt: new Date(),
      },
      select: {
        publishableKey: true,
        accountLabel: true,
        livemode: true,
        status: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, connection: publicShape(saved) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[stripe-keys] save failed', { error: msg });
    return NextResponse.json({ error: 'save_failed', detail: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await prisma.stripeConnection.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
