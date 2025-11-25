import { NextRequest, NextResponse } from 'next/server';
import { getLicenseInfo } from '@/lib/license-manager';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';

/**
 * Vérifie l'accès à la fonctionnalité de réservation en ligne (booking)
 * Disponible uniquement pour Pro et Pro Lifetime
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const licenseInfo = await getLicenseInfo();
    
    // Trial, Pro, et Pro Lifetime ont accès
    const hasAccess = 
      licenseInfo.tier === 'trial' || 
      licenseInfo.tier === 'pro' || 
      licenseInfo.tier === 'pro_lifetime';
    
    if (hasAccess) {
      return NextResponse.json({
        allowed: true,
        requiresUpgrade: false,
        message: 'Accès autorisé',
        tier: licenseInfo.tier,
      });
    }
    
    // Version BASIQUE n'a pas accès
    return NextResponse.json({
      allowed: false,
      requiresUpgrade: true,
      message: 'Les rendez-vous clients en ligne sont disponibles uniquement avec les licences Pro et Pro Lifetime',
      upgradeUrl: '/admin/license/upgrade',
      pricing: {
        pro: '359€/an TTC',
        pro_lifetime: '599€ (paiement unique)',
      },
      tier: licenseInfo.tier,
    });
  } catch (error) {
    logger.error('[License Check Booking] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}

