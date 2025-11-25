import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';


/**
 * POST /api/tunnel/activate
 * Active les RDV en ligne (mode simplifié)
 */
export async function POST(req: NextRequest) {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: 'prisma_unavailable' }, { status: 501 });
    }

    // Récupérer userId avec fallback premier utilisateur
    const userId = await getUserIdOrFirst(req);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { domain } = body;

    // Sauvegarder le domaine RDV dans les settings
    if (domain) {
      await prisma.globalSetting.upsert({
        where: { key: 'cloudflare.rdvHost' },
        update: { value: domain },
        create: { key: 'cloudflare.rdvHost', value: domain },
      });
    }

    // Activer le flag RDV
    await prisma.globalSetting.upsert({
      where: { key: 'booking.enabled' },
      update: { value: 'true' },
      create: { key: 'booking.enabled', value: 'true' },
    });

    logger.info('[TUNNEL] RDV activés:', { domain, userId });

    return NextResponse.json({
      success: true,
      active: true,
      domain: domain || 'rdv-atelier-velo.app',
      message: 'RDV en ligne activés',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur activation';
    logger.error('[API] Erreur activation RDV:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
