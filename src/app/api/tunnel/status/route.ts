import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tunnel/status
 * Retourne le statut des RDV en ligne
 */
export async function GET(_request: NextRequest) {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: 'prisma_unavailable' }, { status: 501 });
    }

    // Vérifier si les RDV sont activés
    const bookingEnabled = await prisma.globalSetting.findUnique({
      where: { key: 'booking.enabled' },
    });

    // Récupérer le domaine RDV
    const rdvHost = await prisma.globalSetting.findUnique({
      where: { key: 'cloudflare.rdvHost' },
    });

    const isActive = bookingEnabled?.value === 'true';
    const domain = rdvHost?.value || 'rdv-atelier-velo.app';

    const status = {
      active: isActive,
      domain,
      url: isActive ? `https://${domain}` : null,
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error('[TUNNEL] Status error:', error);
    return NextResponse.json(
      { error: 'Erreur vérification tunnel' },
      { status: 500 }
    );
  }
}
