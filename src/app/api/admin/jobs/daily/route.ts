/**
 * POST /api/admin/jobs/daily
 * Déclencher manuellement les jobs quotidiens
 * Pour tests et exécution manuelle
 */

import { NextResponse } from 'next/server';
import { runDailyJobs } from '@/lib/scheduler';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    logger.info('[API] 🚀 Déclenchement manuel jobs quotidiens...');
    
    const result = await runDailyJobs();
    
    return NextResponse.json({
      success: true,
      message: 'Jobs quotidiens exécutés avec succès',
      result,
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('[API] ❌ Erreur jobs quotidiens:', message);
    
    return NextResponse.json({
      error: 'job_failed',
      message: error.message || 'Erreur lors de l\'exécution des jobs',
    }, { status: 500 });
  }
}
