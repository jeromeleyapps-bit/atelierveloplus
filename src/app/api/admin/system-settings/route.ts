import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrFirst } from "@/lib/api-helpers";
import { getCache, setCache, invalidateCache } from "@/lib/cache";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ✅ OPTIMISATION: Cache TTL pour settings (5 minutes)
const SETTINGS_CACHE_TTL = 5 * 60 * 1000;

// Clés autorisées pour SystemSettings (AMÉLIORATION CRITIQUE - 16 nov 2025)
// Validation pour éviter injection de champs non autorisés
const ALLOWED_KEYS = [
  'notificationsEnabled',
  'emailNotificationsEnabled',
  'activityLogsEnabled',
  'automatedEmailsEnabled',
  'autoBackupEnabled',
  'backupFrequency',
  'emailProvider',
  'emailApiKey',
  'emailFromAddress',
  'emailFromName',
  'smtpHost',
  'smtpPort',
  'smtpSecure',
  'smtpUser',
  'smtpPass',
  'requireAdmin2FA',
  'hardDeleteEnabled',
  'maintenanceMode',
  'securityAlertsEnabled',
  'tunnelConfigured',
  'tunnelHostname',
] as const;

type AllowedKey = typeof ALLOWED_KEYS[number];

// Format unifié pour SystemSettings (sans champs système)
interface SystemSettingsResponse {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Valider et filtrer les clés autorisées
 */
function validateAndFilterKeys(data: Record<string, unknown>): Partial<Record<AllowedKey, unknown>> {
  const filtered: Partial<Record<AllowedKey, unknown>> = {};
  
  for (const key of ALLOWED_KEYS) {
    if (key in data && data[key] !== undefined) {
      filtered[key] = data[key];
    }
  }
  
  return filtered;
}

/**
 * Convertir Prisma SystemSettings en format unifié (sans champs système)
 */
function formatSettingsResponse(settings: Record<string, any>): SystemSettingsResponse {
  const response: SystemSettingsResponse = {};
  
  for (const key of ALLOWED_KEYS) {
    if (key in settings) {
      response[key] = settings[key];
    }
  }
  
  return response;
}

// Récupérer les paramètres système (FORMAT UNIFIÉ - 16 nov 2025)
export async function GET(req: NextRequest) {
  try {
    // Vérifier que Prisma est disponible
    if (!prisma) {
      logger.error("[SystemSettings GET] Prisma not available");
      return NextResponse.json(
        { error: "database_unavailable", message: "Base de données non disponible" },
        { status: 503 }
      );
    }

    const userId = await getUserIdOrFirst(req);

    // En dev, si pas d'utilisateur, retourner valeurs par défaut au lieu de 404
    // (évite redirection login qui casse le dashboard)
    if (!userId) {
      logger.warn("[SystemSettings GET] No user found, returning default settings");
      const defaultSettings: SystemSettingsResponse = {
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        activityLogsEnabled: true,
        automatedEmailsEnabled: true,
        autoBackupEnabled: false,
        backupFrequency: 'weekly',
        emailProvider: 'resend',
        requireAdmin2FA: false,
        hardDeleteEnabled: false,
        maintenanceMode: false,
        securityAlertsEnabled: true,
        tunnelConfigured: false,
      };
      return NextResponse.json(defaultSettings);
    }

    // ✅ OPTIMISATION: Vérifier cache avant query DB
    const cacheKey = `system-settings:${userId}`;
    const cached = getCache<SystemSettingsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Vérifier que le User existe (évite Foreign Key constraint)
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      logger.warn(`[SystemSettings GET] User ${userId} not found, returning default settings`);
      // Retourner valeurs par défaut au lieu de 404 (compatibilité dev)
      const defaultSettings: SystemSettingsResponse = {
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        activityLogsEnabled: true,
        automatedEmailsEnabled: true,
        autoBackupEnabled: false,
        backupFrequency: 'weekly',
        emailProvider: 'resend',
        requireAdmin2FA: false,
        hardDeleteEnabled: false,
        maintenanceMode: false,
        securityAlertsEnabled: true,
        tunnelConfigured: false,
      };
      return NextResponse.json(defaultSettings);
    }

    // Utiliser upsert au lieu de findUnique + create (plus sûr)
    const settings = await prisma.systemSettings.upsert({
      where: { userId },
      update: { updatedAt: new Date() }, // Mettre à jour timestamp
      create: {
        userId,
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        activityLogsEnabled: true,
        automatedEmailsEnabled: true,
        autoBackupEnabled: false,
        backupFrequency: 'weekly',
        emailProvider: 'resend',
        requireAdmin2FA: false,
        hardDeleteEnabled: false,
        maintenanceMode: false,
        securityAlertsEnabled: true,
        tunnelConfigured: false,
        updatedAt: new Date(),
      }
    });

    // ✅ FORMAT UNIFIÉ: Retourner seulement les champs autorisés (sans champs système)
    const formatted = formatSettingsResponse(settings);
    
    // ✅ OPTIMISATION: Mettre en cache
    setCache(cacheKey, formatted, SETTINGS_CACHE_TTL);
    
    return NextResponse.json(formatted);
  } catch (error) {
    logger.error("[SystemSettings GET] Error:", error);
    
    // Erreur spécifique pour Foreign Key constraint
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: "foreign_key_constraint", message: "Invalid user reference" },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "internal_server_error", message: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// Mettre à jour les paramètres système (FORMAT UNIFIÉ + VALIDATION - 16 nov 2025)
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdOrFirst(req);

    // En dev, si pas d'utilisateur, retourner erreur mais pas 404 (évite redirection)
    if (!userId) {
      logger.warn("[SystemSettings PUT] No user found, cannot update settings");
      return NextResponse.json(
        { error: "no_user_found", message: "Aucun utilisateur trouvé. Veuillez vous connecter." },
        { status: 400 } // 400 au lieu de 404 pour éviter redirection login
      );
    }

    const body = await req.json();
    
    // ✅ FORMAT UNIFIÉ: Support deux formats pour compatibilité
    let updateData: Partial<Record<AllowedKey, unknown>>;
    
    // Format 1: {setting: 'fieldName', value: boolean} (pour les toggles - compatibilité)
    if (body.setting && body.value !== undefined) {
      // Valider que la clé est autorisée
      if (!ALLOWED_KEYS.includes(body.setting as AllowedKey)) {
        return NextResponse.json(
          { error: "invalid_key", message: `Clé non autorisée: ${body.setting}` },
          { status: 400 }
        );
      }
      updateData = { [body.setting]: body.value } as Partial<Record<AllowedKey, unknown>>;
    } else {
      // Format 2: Objet avec toutes les clés (format unifié)
      // ✅ VALIDATION: Filtrer seulement les clés autorisées
      updateData = validateAndFilterKeys(body);
      
      // Valider types
      if (updateData.smtpPort !== undefined && (typeof updateData.smtpPort !== 'number' || updateData.smtpPort < 1 || updateData.smtpPort > 65535)) {
        return NextResponse.json(
          { error: "invalid_value", message: "smtpPort doit être un nombre entre 1 et 65535" },
          { status: 400 }
        );
      }
      
      if (updateData.backupFrequency !== undefined && !['daily', 'weekly', 'monthly'].includes(String(updateData.backupFrequency))) {
        return NextResponse.json(
          { error: "invalid_value", message: "backupFrequency doit être 'daily', 'weekly' ou 'monthly'" },
          { status: 400 }
        );
      }
      
      if (updateData.emailProvider !== undefined && !['resend', 'gmail', 'smtp'].includes(String(updateData.emailProvider))) {
        return NextResponse.json(
          { error: "invalid_value", message: "emailProvider doit être 'resend', 'gmail' ou 'smtp'" },
          { status: 400 }
        );
      }
    }

    // Vérifier qu'au moins une clé valide est fournie
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "no_valid_keys", message: "Aucune clé valide fournie" },
        { status: 400 }
      );
    }

    // Toujours mettre à jour updatedAt
        const prismaUpdateData: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    const settings = await prisma.systemSettings.upsert({
      where: { userId },
      update: prismaUpdateData,
      create: {
        userId,
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        activityLogsEnabled: true,
        automatedEmailsEnabled: true,
        autoBackupEnabled: false,
        backupFrequency: 'weekly',
        emailProvider: 'resend',
        requireAdmin2FA: false,
        hardDeleteEnabled: false,
        maintenanceMode: false,
        securityAlertsEnabled: true,
        tunnelConfigured: false,
        ...prismaUpdateData, // Inclut les valeurs fournies + updatedAt
      }
    });

    // ✅ FORMAT UNIFIÉ: Retourner seulement les champs autorisés (sans champs système)
    const formatted = formatSettingsResponse(settings);
    
    // ✅ OPTIMISATION: Invalider cache après modification
    const cacheKey = `system-settings:${userId}`;
    invalidateCache(cacheKey);
    // Remettre en cache avec nouvelles valeurs
    setCache(cacheKey, formatted, SETTINGS_CACHE_TTL);
    
    return NextResponse.json(formatted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
    logger.error("Error updating system settings:", message);
    
    // Erreur spécifique pour Foreign Key constraint
    if (error && typeof error === 'object' && 'code' in error) {
      if ((error as { code?: string }).code === 'P2003') {
        return NextResponse.json(
          { error: "foreign_key_constraint", message: "Invalid user reference" },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "internal_server_error", message: error?.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
