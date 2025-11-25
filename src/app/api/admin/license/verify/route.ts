/**
 * API Route: Vérification Licence - Phase 2.1
 * POST /api/admin/license/verify
 * 
 * Vérifie validité + expiration + hardware ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyLicense, getActiveLicense } from '../../../../../lib/license-manager';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const result = await verifyLicense();
    const license = await getActiveLicense();
    
    return NextResponse.json({
      valid: result.valid,
      message: result.message,
      tier: license?.tier || 'basique',
      expiresAt: license?.expiresAt || null,
      status: license?.status || 'active',
    });
  } catch (error) {
    logger.error('[License Verify] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
