/**
 * API Route: Statut Licence - Phase 2.1
 * GET /api/admin/license/status
 * 
 * Retourne le statut complet: Trial/Basique/Pro/Pro Lifetime
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLicenseInfo } from '../../../../../lib/license-manager';
import { logger } from '@/lib/logger';


export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    // ✅ FIX PC3: Permettre lecture statut licence sans authentification
    // Nécessaire pour afficher page activation sur nouveau PC
    // Note: getLicenseInfo() ne nécessite pas d'utilisateur spécifique
    const licenseInfo = await getLicenseInfo();
    
    return NextResponse.json({
      ...licenseInfo,
      upgradeUrl: '/admin/license/upgrade', // URL future page upgrade
    });
  } catch (error) {
    logger.error('[License Status] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}
