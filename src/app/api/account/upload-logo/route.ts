import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getUserId } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { handleApiError, ValidationError, AuthenticationError } from '@/lib/error-handler';

/**
 * POST /api/account/upload-logo
 * Upload logo atelier (PNG ou JPG uniquement)
 * Convertit automatiquement en PNG pour compatibilité PDF
 */
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    
    logger.info('UPLOAD LOGO: Upload started', { userId, resourcesPath: process.env.RESOURCES_PATH });
    
    if (!userId) {
      throw new AuthenticationError('Non authentifié');
    }

    const formData = await req.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      throw new ValidationError('Fichier manquant');
    }

    logger.info('UPLOAD LOGO: File received', { filename: file.name, size: file.size });

    // Vérifier extension (PNG ou JPG uniquement)
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['png', 'jpg', 'jpeg'].includes(ext || '')) {
      throw new ValidationError('Format invalide. Formats acceptés: PNG, JPG', { extension: ext });
    }

    // Vérifier taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError('Fichier trop volumineux. Maximum: 5MB', { size: file.size });
    }

    // Créer dossier uploads si inexistant
    // IMPORTANT: Ne PAS utiliser Program Files (EPERM - lecture seule Windows)
    // En production Electron, utiliser AppData (USER_DATA_PATH/uploads)
    // En dev, utiliser public/ du projet
    const uploadsDir = process.env.USER_DATA_PATH
      ? join(process.env.USER_DATA_PATH, 'uploads', 'logos')
      : join(process.cwd(), 'public', 'uploads', 'logos');
    
    logger.debug('UPLOAD LOGO: Uploads directory', { path: uploadsDir, exists: existsSync(uploadsDir) });
    
    if (!existsSync(uploadsDir)) {
      logger.info('UPLOAD LOGO: Creating uploads directory');
      try {
        await mkdir(uploadsDir, { recursive: true });
        logger.info('UPLOAD LOGO: Directory created successfully');
      } catch (mkdirErr) {
        logger.error('UPLOAD LOGO: Failed to create directory', { error: mkdirErr });
        const errorMsg = mkdirErr instanceof Error ? mkdirErr.message : 'Erreur inconnue';
        throw new Error(`Impossible de créer le dossier: ${errorMsg}`);
      }
    }

    // Nom fichier unique: userId_timestamp.png
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.png`;
    const filepath = join(uploadsDir, filename);

    logger.debug('UPLOAD LOGO: Destination file', { filepath });

    // Convertir en PNG avec Jimp (alternative légère à Sharp: 2 MB vs 19 MB)
    const buffer = Buffer.from(await file.arrayBuffer());
    logger.debug('UPLOAD LOGO: Buffer created', { size: buffer.length });
    
    try {
      const { Jimp } = await import('jimp');
      logger.debug('UPLOAD LOGO: Jimp imported');
      
      const image = await Jimp.read(buffer);
      
      // Redimensionner en conservant le ratio (max 512x512)
      const width = image.width;
      const height = image.height;
      if (width > 512 || height > 512) {
        if (width > height) {
          image.resize({ w: 512 });
        } else {
          image.resize({ h: 512 });
        }
      }
      
      // Convertir en PNG
      const pngBuffer = await image.getBuffer('image/png');
      
      logger.debug('UPLOAD LOGO: Image converted', { size: pngBuffer.length });
      logger.debug('UPLOAD LOGO: Writing file');
      
      await writeFile(filepath, pngBuffer);
      
      logger.info('UPLOAD LOGO: Logo saved successfully', { filename, size: pngBuffer.length, exists: existsSync(filepath) });
    } catch (convErr) {
      logger.error('UPLOAD LOGO: Conversion/write error', { error: convErr });
      const errorMsg = convErr instanceof Error ? convErr.message : 'Erreur inconnue';
      throw new ValidationError(`Impossible de traiter l'image: ${errorMsg}`);
    }

    // Retourner chemin relatif
    // Format: /uploads/logos/[userId]_[timestamp].png
    // En Electron: Sera servi depuis AppData via IPC (pas Program Files)
    const relativePath = `/uploads/logos/${filename}`;

    logger.info('UPLOAD LOGO: Upload completed', { path: relativePath });

    return NextResponse.json({ 
      path: relativePath,
      filename,
      size: file.size
    });

  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/account/upload-logo');
  }
}
