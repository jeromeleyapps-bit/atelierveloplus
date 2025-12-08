/**
 * POST /api/admin/license/activate/**
 * API Route: Activation de licence - Phase 2.1
 * POST /api/admin/license/activate
 * 
 * Supporte: Trial, Basique (199€), Pro (359€), Pro Lifetime (599€)
 */

import { NextRequest, NextResponse } from 'next/server';
import { activateLicense } from '../../../../../lib/license-manager';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { handleApiError, ValidationError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ✅ FIX PC3: Permettre activation sans authentification sur nouveau PC
    // Utiliser getUserIdOrFirst pour récupérer le premier utilisateur si pas d'auth
    const userId = await getUserIdOrFirst(req);
    // Note: userId n'est pas utilisé par activateLicense, mais on vérifie qu'un utilisateur existe
    if (!userId) {
      // Si aucun utilisateur n'existe, on peut quand même activer (nouveau PC)
      logger.warn('[License Activate] No user found, allowing activation for new PC');
    }
    
    const body = await req.json();
    const { key, email, name } = body;
    
    logger.info('LICENSE ACTIVATE: Activation request', { key: key?.substring(0, 10) + '...', email });
    
    if (!key) {
      throw new ValidationError('Clé de licence requise');
    }
    
    // Activer la licence
    const result = await activateLicense(key, email, name);
    
    if (!result.success) {
      logger.warn('LICENSE ACTIVATE: Activation failed', { key: key?.substring(0, 10) + '...', message: result.message });
      throw new ValidationError(result.message);
    }
    
    logger.info('LICENSE ACTIVATE: Activation successful', { tier: result.license.tier, email });
    
    return NextResponse.json({
      success: true,
      message: result.message,
      license: {
        tier: result.license.tier,
        expiresAt: result.license.expiresAt,
        status: result.license.status,
      },
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/license/activate');
  }
}
