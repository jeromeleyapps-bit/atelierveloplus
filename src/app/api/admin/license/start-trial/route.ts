/**
 * API Route: Démarrer Trial Gratuit 14 jours - Phase 2.1
 * POST /api/admin/license/start-trial
 * 
 * Démarre un trial de 14 jours avec fonctionnalités PRO complètes
 */

import { NextRequest, NextResponse } from 'next/server';
import { startTrial } from '../../../../../lib/license-manager';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { email, name } = body;
    
    if (!email || !name) {
      return NextResponse.json(
        { error: 'missing_params', message: 'Email et nom requis' },
        { status: 400 }
      );
    }
    
    // Démarrer le trial
    const result = await startTrial(email, name);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'trial_failed', message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
      trial: {
        tier: result.license.tier,
        trialEndsAt: result.license.trialEndsAt,
        status: result.license.status,
      },
    });
  } catch (error) {
    logger.error('[License Start Trial] Error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Erreur lors du démarrage du trial' },
      { status: 500 }
    );
  }
}
