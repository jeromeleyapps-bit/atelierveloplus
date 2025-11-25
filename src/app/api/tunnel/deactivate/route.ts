import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';


/**
 * POST /api/tunnel/deactivate
 * Désactive les RDV en ligne
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

    // Désactiver le flag RDV
    await prisma.globalSetting.upsert({
      where: { key: 'booking.enabled' },
      update: { value: 'false' },
      create: { key: 'booking.enabled', value: 'false' },
    });

    logger.info('[TUNNEL] RDV désactivés:', { userId });

    return NextResponse.json({
      success: true,
      active: false,
      message: 'RDV en ligne désactivés',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur désactivation';
    logger.error('[API] Erreur désactivation RDV:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
