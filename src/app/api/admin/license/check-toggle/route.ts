/**
 * API Route: Vérification Accès Toggle - Phase 2.1
 * POST /api/admin/license/check-toggle
 * 
 * Vérifie accès selon tier: Trial/Pro/Pro Lifetime = accès complet, Basique = verrouillé
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLicenseInfo } from '../../../../../lib/license-manager';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type ToggleType = 'notifications' | 'emails' | 'logs' | 'automated';

const toggleMessages: Record<ToggleType, string> = {
  notifications: 'Recevez des alertes en temps réel pour ne rien manquer',
  emails: 'Envoyez des confirmations et rappels automatiques',
  logs: 'Tracez toutes les actions pour une meilleure sécurité',
  automated: 'Fidélisez vos clients avec des emails de satisfaction et maintenance',
};

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { toggle } = body;
    
    if (!toggle || !['notifications', 'emails', 'logs', 'automated'].includes(toggle)) {
      return NextResponse.json(
        { error: 'invalid_toggle', message: 'Toggle invalide' },
        { status: 400 }
      );
    }
    
    const licenseInfo = await getLicenseInfo();
    
    // Trial, Pro, et Pro Lifetime ont accès complet
    if (licenseInfo.tier === 'trial' || licenseInfo.tier === 'pro' || licenseInfo.tier === 'pro_lifetime') {
      return NextResponse.json({
        allowed: true,
        requiresUpgrade: false,
        message: 'Accès autorisé',
        tier: licenseInfo.tier,
      });
    }
    
    // En version BASIQUE, les toggles sont verrouillés
    return NextResponse.json({
      allowed: false,
      requiresUpgrade: true,
      message: toggleMessages[toggle as ToggleType],
      upgradeUrl: '/admin/license/upgrade',
      pricing: {
        basique: '199€/an TTC',
        pro: '359€/an TTC',
        pro_lifetime: '599€ (paiement unique)',
      },
      tier: 'basique',
    });
  } catch (error) {
    logger.error('[License Check Toggle] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
