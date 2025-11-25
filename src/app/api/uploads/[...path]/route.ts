import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

/**
 * GET /api/uploads/[...path]
 * Sert les fichiers uploads depuis AppData (USER_DATA_PATH/uploads)
 * 
 * Raison: Program Files = lecture seule (EPERM)
 * Solution: Uploads dans AppData\Roaming\Atelier Velo+\uploads
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Path manquant', { status: 400 });
    }

    // Construire chemin fichier
    const uploadsRoot = process.env.USER_DATA_PATH
      ? join(process.env.USER_DATA_PATH, 'uploads')
      : join(process.cwd(), 'public', 'uploads');
    
    const filepath = join(uploadsRoot, ...pathSegments);
    
    // Sécurité: Vérifier que le chemin reste dans uploads
    if (!filepath.startsWith(uploadsRoot)) {
      logger.error('[UPLOADS-SERVE] ❌ Path traversal attempt:', filepath);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Vérifier existence
    if (!existsSync(filepath)) {
      logger.warn('[UPLOADS-SERVE] ⚠️  Fichier introuvable:', filepath);
      return new NextResponse('Fichier introuvable', { status: 404 });
    }

    // Lire fichier
    const buffer = await readFile(filepath);
    
    // Déterminer Content-Type
    const ext = pathSegments[pathSegments.length - 1].toLowerCase().split('.').pop();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'png': contentType = 'image/png'; break;
      case 'jpg':
      case 'jpeg': contentType = 'image/jpeg'; break;
      case 'gif': contentType = 'image/gif'; break;
      case 'svg': contentType = 'image/svg+xml'; break;
      case 'webp': contentType = 'image/webp'; break;
    }

    // Retourner fichier avec cache
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('[UPLOADS-SERVE] ❌ Erreur:', message);
    return new NextResponse('Erreur serveur', { status: 500 });
  }
}
