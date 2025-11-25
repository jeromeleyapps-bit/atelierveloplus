/**
 * API Route Helpers
 * Fonctions utilitaires communes pour éviter la duplication de code
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Récupère l'userId depuis les headers de la requête
 * Supporte:
 * - Header x-user-id (Electron local)
 * - Authorization Bearer token (JWT)
 */
export function getUserId(req: Request): string | null {
  // 1. Essayer x-user-id d'abord (Electron)
  const xUserId = req.headers.get("x-user-id");
  if (xUserId && xUserId.trim()) {
    return xUserId.trim();
  }

  // 2. Essayer JWT Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.userId || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Récupère l'userId ou utilise le premier utilisateur en fallback
 * Utile pour les environnements Electron où l'auth est simplifiée
 * 
 * ✅ BEST PRACTICE: Accepte 'electron-local' comme marqueur valide du middleware
 * Le middleware Electron définit x-user-id: 'electron-local' pour indiquer
 * qu'on est en mode Electron local et qu'il faut utiliser le premier utilisateur
 */
export async function getUserIdOrFirst(req: Request): Promise<string | null> {
  try {
    let userId = getUserId(req);
    
    // ✅ FIX: Si userId est 'electron-local', c'est un marqueur valide du middleware
    // Il indique qu'on est en mode Electron et qu'il faut utiliser le premier utilisateur
    const isElectronLocal = userId === 'electron-local';
    
    // Fallback: utiliser le premier utilisateur si pas d'userId ou mode Electron
    if (!userId || isElectronLocal) {
      try {
        const firstUser = await prisma.user.findFirst({
          where: { active: true },
          orderBy: { createdAt: 'asc' }
        });
        userId = firstUser?.id || null;
        
        if (!userId) {
          logger.warn('[getUserIdOrFirst] No active user found in database');
          return null;
        }
      } catch (prismaError) {
        logger.error('[getUserIdOrFirst] Prisma error:', prismaError);
        // En cas d'erreur Prisma, retourner null plutôt que de throw
        return null;
      }
    }

    return userId;
  } catch (error) {
    logger.error('[getUserIdOrFirst] Unexpected error:', error);
    return null;
  }
}

/**
 * Récupère le statut auto-entrepreneur de l'utilisateur
 * Retourne false si non trouvé ou erreur
 */
export async function getIsAutoEntrepreneur(userId?: string | null): Promise<boolean> {
  try {
    // Si pas d'userId, utiliser le premier utilisateur
    let targetUserId = userId;
    if (!targetUserId) {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      targetUserId = firstUser?.id;
    }

    if (!targetUserId) return false;

    const settings = await prisma.appSetting.findUnique({
      where: { userId: targetUserId },
      select: { isAutoEntrepreneur: true }
    });

    return settings?.isAutoEntrepreneur || false;
  } catch (error) {
    logger.error('[API Helper] Error fetching isAutoEntrepreneur:', error);
    return false;
  }
}

/**
 * Récupère les paramètres utilisateur (appSetting)
 * Avec fallback sur le premier utilisateur si pas d'userId
 */
export async function getUserSettings(userId?: string | null) {
  try {
    // Si pas d'userId, utiliser le premier utilisateur
    let targetUserId = userId;
    if (!targetUserId) {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      targetUserId = firstUser?.id;
    }

    if (!targetUserId) return null;

    const settings = await prisma.appSetting.findUnique({
      where: { userId: targetUserId }
    });

    return settings;
  } catch (error) {
    logger.error('[API Helper] Error fetching user settings:', error);
    return null;
  }
}
