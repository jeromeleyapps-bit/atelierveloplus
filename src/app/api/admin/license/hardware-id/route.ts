/**
 * GET /api/admin/license/hardware-id
 * Retourne l'identifiant matériel unique de cette machine
 * Utilisé pour la génération de licences liées à une machine spécifique
 */

import { NextResponse } from 'next/server';
import { getHardwareId } from '@/lib/license-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hardwareId = getHardwareId();
    
    // Retourner une version tronquée pour l'affichage (8 premiers caractères suffisent)
    // et la version complète pour la génération de licence
    return NextResponse.json({
      success: true,
      hardwareId: hardwareId,
      displayId: hardwareId.substring(0, 16).toUpperCase(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
