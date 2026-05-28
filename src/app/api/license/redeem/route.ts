import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLicense, type Tier } from '@/lib/license-generator-server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIERS: Tier[] = ['basique', 'pro', 'pro_lifetime'];

/**
 * POST /api/license/redeem
 * Body: { token, hardwareId }
 *
 * Échange un code d'activation contre une clé de licence machine-bound.
 * Idempotent : si le token a déjà été utilisé avec le même hardwareId, on renvoie la même clé.
 */
export async function POST(req: Request) {
  try {
    const { token, hardwareId } = await req.json();
    if (typeof token !== 'string' || token.length < 8) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }
    if (typeof hardwareId !== 'string' || hardwareId.length < 16) {
      return NextResponse.json({ error: 'invalid_hardware_id' }, { status: 400 });
    }

    const normalizedToken = token.trim().toUpperCase();
    const purchaseToken = await prisma.purchaseToken.findUnique({
      where: { token: normalizedToken },
    });
    if (!purchaseToken) {
      return NextResponse.json({ error: 'token_not_found' }, { status: 404 });
    }
    if (purchaseToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 410 });
    }
    if (!TIERS.includes(purchaseToken.tier as Tier)) {
      return NextResponse.json({ error: 'invalid_tier_stored' }, { status: 500 });
    }

    // Idempotence : si déjà utilisé avec ce même hardwareId, on renvoie la même clé.
    if (purchaseToken.redeemedAt && purchaseToken.licenseKey) {
      if (purchaseToken.hardwareId === hardwareId.substring(0, 16).toUpperCase()) {
        return NextResponse.json({
          ok: true,
          alreadyRedeemed: true,
          licenseKey: purchaseToken.licenseKey,
          tier: purchaseToken.tier,
        });
      }
      return NextResponse.json({ error: 'token_already_used_other_machine' }, { status: 409 });
    }

    const license = generateLicense(purchaseToken.tier as Tier, hardwareId);

    await prisma.purchaseToken.update({
      where: { id: purchaseToken.id },
      data: {
        redeemedAt: new Date(),
        licenseKey: license.key,
        hardwareId: license.hardwareId,
      },
    });

    await prisma.order.update({
      where: { id: purchaseToken.orderId },
      data: { licenseKey: license.key },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      licenseKey: license.key,
      tier: license.tier,
      expiryDate: license.expiryDate?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[license/redeem] failed', { error: msg });
    return NextResponse.json({ error: 'redeem_failed', detail: msg }, { status: 500 });
  }
}
