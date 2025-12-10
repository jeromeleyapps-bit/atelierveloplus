/**
 * License Manager - Phase 2.1
 * Gestion centralisée des licences Trial/Basique/Pro/Pro Lifetime
 * 
 * Nouveaux tiers (Nov 2025):
 * - Trial: 14 jours gratuit (version PRO complète)
 * - Basique: 199€/an (30 emails/mois, PDF création only)
 * - Pro: 359€/an (illimité, PDF envoi direct)
 * - Pro Lifetime: 599€ (PRO à vie, maintenance 3 ans)
 */

import { prisma } from './prisma';
import type { License } from '@prisma/client';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

// ============================================
// TYPES & INTERFACES
// ============================================

export type LicenseTier = 'trial' | 'basique' | 'pro' | 'pro_lifetime';
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'grace' | 'blocked';

export interface LicenseInfo {
  tier: LicenseTier;
  status: LicenseStatus;
  isTrial: boolean;
  isLifetime: boolean;
  features: {
    unlimitedEmails: boolean;
    marketingCampaigns: boolean;
    bookingOnline: boolean;
    advancedStats: boolean;
    togglesUnlocked: boolean;
    pdfDirectSend: boolean; // Phase 2.1 - Basic peut créer PDF mais pas envoyer
  };
  limits: {
    emailsPerMonth: number;
    emailsRemaining: number;
    emailResetDate: Date;
  };
  trial?: {
    startedAt: Date;
    endsAt: Date;
    daysRemaining: number;
  };
  gracePeriod?: {
    endsAt: Date;
    daysRemaining: number;
  };
  expiresAt?: Date;
  daysUntilExpiry?: number;
  maintenanceExpiresAt?: Date; // Pour lifetime
}

// ============================================
// PRICING CONSTANTS (Phase 2.1)
// ============================================

export const PRICING = {
  trial: {
    price: 0,
    duration: 14, // jours
    tier: 'pro' as const, // Trial = version PRO complète
    currency: 'EUR',
  },
  basique: {
    price: 199,
    currency: 'EUR',
    annual: true,
    maxEmailsPerMonth: 30, // Phase 2.1: 30 emails/mois au lieu de 50/semaine
    features: {
      marketing: false,
      booking: false,
      advancedStats: false,
      pdfDirectSend: false, // Peut créer PDF mais pas envoyer depuis app
      togglesUnlocked: false,
    },
  },
  pro: {
    price: 359,
    currency: 'EUR',
    annual: true,
    maxEmailsPerMonth: -1, // Illimité
    features: {
      marketing: true,
      booking: true,
      advancedStats: true,
      pdfDirectSend: true,
      togglesUnlocked: true,
    },
  },
  pro_lifetime: {
    price: 599,
    currency: 'EUR',
    oneTime: true,
    maintenanceYears: 3, // 3 ans de maintenance inclus
    maxEmailsPerMonth: -1, // Illimité
    features: {
      marketing: true,
      booking: true,
      advancedStats: true,
      pdfDirectSend: true,
      togglesUnlocked: true,
    },
  },
} as const;

// ============================================
// HARDWARE ID (Anti-partage)
// ============================================

export function getHardwareId(): string {
  const networkInterfaces = os.networkInterfaces();
  const macs: string[] = [];
  
  for (const name of Object.keys(networkInterfaces)) {
    const nets = networkInterfaces[name];
    if (!nets) continue;
    
    for (const net of nets) {
      if (!net.internal && net.mac !== '00:00:00:00:00:00') {
        macs.push(net.mac);
      }
    }
  }
  
  const platform = os.platform();
  const hostname = os.hostname();
  const cpus = os.cpus()[0]?.model || 'unknown';
  
  // Hash SHA-256 pour anonymiser
  const combined = `${macs.join('-')}-${platform}-${hostname}-${cpus}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// ============================================
// LICENSE KEY GENERATION
// ============================================

// ⚠️ NOTE: La génération de clés se fait uniquement via le générateur (license-generator/generate-license.js)
// avec signature RSA. Les clés ne peuvent pas être générées dans l'application car la clé privée RSA
// doit rester sécurisée et n'est disponible que dans le générateur.

// ============================================
// CONFIGURATION RSA
// ============================================

// Charger la clé publique RSA (embarquée dans l'app)
let PUBLIC_KEY: string | null = null;

function loadPublicKey(): string {
  if (PUBLIC_KEY) return PUBLIC_KEY;
  
  try {
    // Détecter si on est dans un ASAR (production Electron)
    const isAsar = __dirname.includes('app.asar');
    const resourcesPath = typeof process !== 'undefined' && (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    
    // Chemins possibles pour la clé publique
    const possiblePaths = [
      // Dev: src/lib/
      path.join(process.cwd(), 'src', 'lib', 'license-rsa-public.pem'),
      // Dev: electron-resources/
      path.join(process.cwd(), 'electron-resources', 'web', 'src', 'lib', 'license-rsa-public.pem'),
      // Production ASAR: chemin direct dans l'ASAR
      ...(resourcesPath ? [
        path.join(resourcesPath, 'app.asar', 'electron', 'web', 'src', 'lib', 'license-rsa-public.pem'),
      ] : []),
      // Production ASAR: __dirname pointe vers le dossier du fichier compilé
      path.join(__dirname, 'license-rsa-public.pem'),
      // Production: chemin relatif depuis le serveur Next.js
      path.join(process.cwd(), 'electron', 'web', 'src', 'lib', 'license-rsa-public.pem'),
      // Production: chemin depuis __dirname vers src/lib (remonte depuis .next/server/)
      ...(isAsar ? [
        path.join(__dirname, '..', '..', 'src', 'lib', 'license-rsa-public.pem'),
        path.join(__dirname, '..', '..', '..', 'src', 'lib', 'license-rsa-public.pem'),
      ] : []),
    ];
    
    for (const pemPath of possiblePaths) {
      if (fs.existsSync(pemPath)) {
        logger.info('[License Manager] Clé publique trouvée:', { path: pemPath });
        PUBLIC_KEY = fs.readFileSync(pemPath, 'utf8');
        return PUBLIC_KEY;
      }
    }
    
    // Option fallback: Base64 embarqué dans variable d'environnement
    const publicKeyBase64 = process.env.LICENSE_PUBLIC_KEY_BASE64;
    if (publicKeyBase64) {
      logger.info('[License Manager] Clé publique chargée depuis env BASE64');
      PUBLIC_KEY = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
      return PUBLIC_KEY;
    }
    
    // Log tous les chemins testés pour debug
    logger.error('[License Manager] Clé publique non trouvée. Chemins testés:', { paths: possiblePaths });
    throw new Error('Clé publique RSA non trouvée. Fichier license-rsa-public.pem manquant.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Manager] Erreur chargement clé publique RSA:', { error: errorMessage });
    throw error;
  }
}

/**
 * Valide la signature RSA d'une clé de licence
 * Format clé v2 (avec hardwareId): PREFIX-RANDOM-EXPIRY-HWID-SIGNATURE
 * Format clé v1 (legacy): PREFIX-RANDOM-EXPIRY-SIGNATURE
 * @param {string} key - Clé de licence complète
 * @returns {boolean} True si signature valide
 */
export function validateRSASignature(key: string): boolean {
  try {
    const parts = key.split('-');
    
    // Format v2 avec hardwareId: 5 parties (PREFIX-RANDOM-EXPIRY-HWID-SIGNATURE)
    // Format v1 legacy: 4 parties (PREFIX-RANDOM-EXPIRY-SIGNATURE)
    if (parts.length < 4) return false;
    
    let dataForVerification: string;
    let signature: string;
    
    if (parts.length >= 5 && parts[3].length === 16) {
      // Format v2: PREFIX-RANDOM-EXPIRY-HWID-SIGNATURE
      const [prefix, randomSegment, expirySegment, hwid, sig] = parts;
      signature = sig;
      dataForVerification = `${prefix}-${randomSegment}-${expirySegment}-${hwid}`;
      logger.info('[License Manager] Format v2 détecté (avec hardwareId)', { hwid });
    } else {
      // Format v1 legacy: PREFIX-RANDOM-EXPIRY-SIGNATURE
      const [prefix, randomSegment, expirySegment, sig] = parts;
      signature = sig;
      dataForVerification = `${prefix}-${randomSegment}-${expirySegment}`;
      logger.info('[License Manager] Format v1 legacy détecté (sans hardwareId)');
    }
    
    // Vérifier que la signature fait 512 chars (RSA 2048 en hex)
    if (signature.length !== 512) return false;
    
    // Vérifier que la signature est en hex (case insensitive)
    if (!/^[A-Fa-f0-9]{512}$/.test(signature)) return false;
    
    // Charger clé publique
    const publicKey = loadPublicKey();
    
    // Vérifier signature RSA-SHA256
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(dataForVerification);
    verify.end();
    
    // Signature en hex (512 chars)
    const isValid = verify.verify(publicKey, signature, 'hex');
    
    return isValid;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Manager] Erreur validation signature RSA', { error: errorMessage });
    return false;
  }
}

/**
 * Valide le format d'une clé de licence (RSA uniquement)
 * Format v2 (avec hardwareId): AVXX-XXXX-XXXX-HWIDXXXXXXXX-512CHARS
 * Format v1 (legacy): AVXX-XXXX-XXXX-512CHARS
 */
export function validateLicenseKeyFormat(key: string): boolean {
  // Format v2 avec hardwareId: AVXX-XXXX-XXXX-16CHARS-512CHARS
  const regexV2 = /^(AVTR|AVBS|AVPR|AVPL)-[A-Fa-f0-9]{4}-[0-9]{4}-[A-Fa-f0-9]{16}-[A-Fa-f0-9]{512}$/;
  // Format v1 legacy: AVXX-XXXX-XXXX-512CHARS
  const regexV1 = /^(AVTR|AVBS|AVPR|AVPL)-[A-Fa-f0-9]{4}-[0-9]{4}-[A-Fa-f0-9]{512}$/;
  return regexV2.test(key) || regexV1.test(key);
}

/**
 * Extrait le hardwareId d'une clé de licence (format v2 uniquement)
 * @returns Le hardwareId (16 chars) ou null si format v1
 */
export function extractHardwareIdFromKey(key: string): string | null {
  const parts = key.split('-');
  // Format v2: 5 parties avec hwid de 16 chars en position 3
  if (parts.length >= 5 && parts[3].length === 16) {
    return parts[3].toUpperCase();
  }
  return null;
}

/**
 * Vérifie si le hardwareId de la clé correspond à cette machine
 * @returns true si match ou si clé v1 (legacy sans hwid)
 */
export function verifyHardwareIdMatch(key: string): { valid: boolean; message: string } {
  const keyHwid = extractHardwareIdFromKey(key);
  
  // Format v1 legacy: pas de vérification hwid
  if (!keyHwid) {
    return { valid: true, message: 'Clé format v1 (legacy) - pas de vérification machine' };
  }
  
  // Format v2: vérifier que le hwid correspond
  const currentHwid = getHardwareId().substring(0, 16).toUpperCase();
  
  if (keyHwid === currentHwid) {
    return { valid: true, message: 'Identifiant machine vérifié' };
  }
  
  return { 
    valid: false, 
    message: `Cette licence est liée à une autre machine (${keyHwid}). Votre machine: ${currentHwid}` 
  };
}

/**
 * Extrait le tier d'une clé de licence
 */
export function extractTierFromKey(key: string): LicenseTier {
  const prefix = key.substring(0, 4);
  switch (prefix) {
    case 'AVTR':
      return 'trial';
    case 'AVBS':
      return 'basique';
    case 'AVPR':
      return 'pro';
    case 'AVPL':
      return 'pro_lifetime';
    default:
      throw new Error('Préfixe de clé invalide');
  }
}

/**
 * Extrait la date d'expiration encodée dans la clé
 */
export function extractExpiryFromKey(key: string): Date | null {
  const parts = key.split('-');
  if (parts.length < 3) return null;
  
  const expirySegment = parts[2]; // MMYY
  if (expirySegment === '0000') return null; // Lifetime ou trial
  
  const month = parseInt(expirySegment.substring(0, 2), 10);
  const year = parseInt('20' + expirySegment.substring(2, 4), 10);
  
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return null;
  }
  
  // Dernier jour du mois
  return new Date(year, month, 0, 23, 59, 59);
}

// ============================================
// LICENSE CRUD
// ============================================

/**
 * Récupère la licence active (avec priorité par tier)
 * Priorité: Pro Lifetime > Pro > Basique > Trial
 */
export async function getActiveLicense() {
  try {
    // Récupérer toutes les licences actives
    const licenses = await prisma.license.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        activatedAt: 'desc',
      },
    });
    
    if (licenses.length === 0) {
      return null;
    }
    
    // Si une seule licence, la retourner
    if (licenses.length === 1) {
      return licenses[0];
    }
    
    // Plusieurs licences actives → Prioriser par tier
    const tierPriority: Record<string, number> = {
      'pro_lifetime': 4,
      'pro': 3,
      'basique': 2,
      'trial': 1,
    };
    
    // Trier par priorité (plus haute d'abord) puis par date
    const sorted = licenses.sort((a, b) => {
      const priorityA = tierPriority[a.tier] || 0;
      const priorityB = tierPriority[b.tier] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Plus haute priorité d'abord
      }
      
      // Même priorité → Plus récente d'abord
      return b.activatedAt.getTime() - a.activatedAt.getTime();
    });
    
    const selected = sorted[0];
    
    // Log si plusieurs licences actives (situation anormale)
    if (licenses.length > 1) {
      logger.warn(`[License Manager] ⚠️ Multiple active licenses found (${licenses.length}). Selected: ${selected.tier} (${selected.key.substring(0, 20)}...)`);
      logger.warn(`[License Manager] 💡 Consider deactivating lower-tier licenses`);
    }
    
    return selected;
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur Prisma (table n'existe pas, DB inaccessible), 
    // retourner null pour bloquer toutes les fonctionnalités protégées
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Manager] Error fetching license', { error: errorMessage });
    return null;
  }
}

/**
 * Récupère les informations complètes de la licence
 */
export async function getLicenseInfo(): Promise<LicenseInfo> {
  try {
    // ✅ Vérifier et mettre à jour les trials expirés AVANT de récupérer la licence
    // Ceci garantit que les trials expirés passent en grace period ou sont bloqués
    try {
      await checkAndDowngradeExpiredTrials();
    } catch (checkError) {
      // Ignorer les erreurs de vérification pour ne pas bloquer l'accès
      logger.warn('[License Manager] Error checking expired trials:', checkError);
    }
    
    let license = await getActiveLicense();
    
    if (!license) {
      // ✅ AUTO-START TRIAL: Créer automatiquement un trial 14 jours si aucune licence n'existe
      logger.info('[License Manager] No active license found - auto-starting trial');
      try {
        const trialResult = await startTrial('auto@trial.local', 'Auto Trial');
        if (trialResult.success && trialResult.license) {
          license = trialResult.license;
          logger.info('[License Manager] ✅ Auto-trial créé avec succès');
        } else {
          // Si échec création trial, retourner mode dégradé (basique sans features)
          logger.warn('[License Manager] Failed to auto-start trial - returning degraded mode');
          return {
            tier: 'basique',
            status: 'active',
            isTrial: false,
            isLifetime: false,
            features: {
              unlimitedEmails: false,
              marketingCampaigns: false,
              bookingOnline: false,
              advancedStats: false,
              togglesUnlocked: false,
              pdfDirectSend: false,
            },
            limits: {
              emailsPerMonth: PRICING.basique.maxEmailsPerMonth,
              emailsRemaining: 0,
              emailResetDate: new Date(),
            },
          };
        }
      } catch (trialError) {
        logger.error('[License Manager] Error auto-starting trial:', trialError);
        // Fallback en mode dégradé
        return {
          tier: 'basique',
          status: 'active',
          isTrial: false,
          isLifetime: false,
          features: {
            unlimitedEmails: false,
            marketingCampaigns: false,
            bookingOnline: false,
            advancedStats: false,
            togglesUnlocked: false,
            pdfDirectSend: false,
          },
          limits: {
            emailsPerMonth: PRICING.basique.maxEmailsPerMonth,
            emailsRemaining: 0,
            emailResetDate: new Date(),
          },
        };
      }
    }
    
    // ⚠️ BLOQUÉ: Si status === 'blocked', retourner licence bloquée
    if (license.status === 'blocked') {
      logger.warn('[License Manager] ❌ License BLOCKED - Application access denied');
      return {
        tier: license.tier as LicenseTier,
        status: 'blocked',
        isTrial: false,
        isLifetime: false,
        features: {
          unlimitedEmails: false,
          marketingCampaigns: false,
          bookingOnline: false,
          advancedStats: false,
          togglesUnlocked: false,
          pdfDirectSend: false,
        },
        limits: {
          emailsPerMonth: 0,
          emailsRemaining: 0,
          emailResetDate: new Date(),
        },
      };
    }
    
    const tier = license.tier as LicenseTier;
    const isPro = tier === 'pro' || tier === 'pro_lifetime';
    const isTrial = tier === 'trial';
    const isLifetime = license.isLifetime || tier === 'pro_lifetime';
    
    // Calcul emails restants
    const emailsPerMonth = license.maxEmailsPerMonth;
    const emailsUsed = license.emailsThisMonth;
    const emailsRemaining = emailsPerMonth === -1 ? -1 : Math.max(0, emailsPerMonth - emailsUsed);
    
    // Calcul jours avant expiration
    let daysUntilExpiry: number | undefined;
    if (license.expiresAt && !isLifetime) {
      const now = new Date();
      const diffMs = license.expiresAt.getTime() - now.getTime();
      daysUntilExpiry = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    
    // Info trial
    let trialInfo: LicenseInfo['trial'];
    if (isTrial && license.trialStartedAt && license.trialEndsAt) {
      const now = new Date();
      const diffMs = license.trialEndsAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      
      trialInfo = {
        startedAt: license.trialStartedAt,
        endsAt: license.trialEndsAt,
        daysRemaining,
      };
    }
    
    // Info grace period
    let gracePeriodInfo: LicenseInfo['gracePeriod'];
    if (license.status === 'grace' && license.gracePeriodEndsAt) {
      const now = new Date();
      const diffMs = license.gracePeriodEndsAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      
      gracePeriodInfo = {
        endsAt: license.gracePeriodEndsAt,
        daysRemaining,
      };
    }
    
    return {
      tier,
      status: license.status as LicenseStatus,
      isTrial,
      isLifetime,
      features: {
        unlimitedEmails: isPro || isTrial,
        marketingCampaigns: license.marketingEnabled,
        bookingOnline: license.bookingEnabled,
        advancedStats: license.advancedStatsEnabled,
        togglesUnlocked: isPro || isTrial,
        pdfDirectSend: license.pdfDirectSendEnabled,
      },
      limits: {
        emailsPerMonth: emailsPerMonth,
        emailsRemaining: emailsRemaining,
        emailResetDate: license.emailResetDate,
      },
      trial: trialInfo,
      gracePeriod: gracePeriodInfo,
      expiresAt: license.expiresAt || undefined,
      daysUntilExpiry,
      maintenanceExpiresAt: license.maintenanceExpiresAt || undefined,
    };
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur Prisma (table n'existe pas, DB inaccessible), 
    // retourner mode TRIAL par défaut (mode gracieux)
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Manager] Error fetching license info:', { error: errorMessage });
    return {
      tier: 'trial',
      status: 'active',
      isTrial: true,
      isLifetime: false,
      features: {
        unlimitedEmails: true, // Trial = toutes features activées
        marketingCampaigns: true,
        bookingOnline: true,
        advancedStats: true,
        togglesUnlocked: true,
        pdfDirectSend: true,
      },
      limits: {
        emailsPerMonth: -1, // Illimité en trial
        emailsRemaining: -1,
        emailResetDate: new Date(),
      },
      trial: {
        startedAt: new Date(),
        daysRemaining: 14,
        endsAt: (() => {
          const end = new Date();
          end.setDate(end.getDate() + 14);
          return end;
        })(),
      },
    };
  }
}

/**
 * Active une licence avec une clé
 */
export async function activateLicense(
  key: string,
  customerEmail: string,
  customerName: string
): Promise<{ success: boolean; message: string; license?: License }> {
  try {
    // ✅ NOUVEAU: Valider le format RSA uniquement
    if (!validateLicenseKeyFormat(key)) {
      return {
        success: false,
        message: 'Format de clé invalide. Format attendu: AVXX-XXXX-XXXX-512CHARS (signature RSA)',
      };
    }
    
    // ✅ NOUVEAU: Valider signature RSA
    if (!validateRSASignature(key)) {
      return {
        success: false,
        message: '❌ Signature RSA invalide. Cette clé de licence est contrefaite ou corrompue.',
      };
    }
    
    logger.info('[License Manager] ✅ Signature RSA valide');
    
    // ✅ NOUVEAU v2: Vérifier que le hardwareId correspond à cette machine
    const hwidCheck = verifyHardwareIdMatch(key);
    if (!hwidCheck.valid) {
      logger.warn('[License Manager] ❌ Hardware ID mismatch', { message: hwidCheck.message });
      return {
        success: false,
        message: `❌ ${hwidCheck.message}. Contactez le support pour obtenir une licence pour cette machine.`,
      };
    }
    logger.info('[License Manager] ✅ ' + hwidCheck.message);
    
    // Vérifier si la clé existe déjà
    const existing = await prisma.license.findUnique({
      where: { key },
    });
    
    if (existing) {
      return {
        success: false,
        message: 'Cette clé de licence est déjà utilisée.',
      };
    }
    
    // Extraire tier et expiration
    const tier = extractTierFromKey(key);
    const expiryDate = extractExpiryFromKey(key);
    
    // Déterminer les features selon le tier
    let maxEmailsPerMonth: number = PRICING.basique.maxEmailsPerMonth;
    let isLifetime = false;
    let maintenanceExpiresAt: Date | null = null;
    let marketingEnabled = false;
    let bookingEnabled = false;
    let advancedStatsEnabled = false;
    let pdfDirectSendEnabled = false;
    
    if (tier === 'pro') {
      maxEmailsPerMonth = PRICING.pro.maxEmailsPerMonth;
      marketingEnabled = PRICING.pro.features.marketing;
      bookingEnabled = PRICING.pro.features.booking;
      advancedStatsEnabled = PRICING.pro.features.advancedStats;
      pdfDirectSendEnabled = PRICING.pro.features.pdfDirectSend;
    } else if (tier === 'pro_lifetime') {
      const maintenanceExpiry = new Date();
      maintenanceExpiry.setFullYear(maintenanceExpiry.getFullYear() + PRICING.pro_lifetime.maintenanceYears);
      
      maxEmailsPerMonth = PRICING.pro_lifetime.maxEmailsPerMonth;
      isLifetime = true;
      maintenanceExpiresAt = maintenanceExpiry;
      marketingEnabled = PRICING.pro_lifetime.features.marketing;
      bookingEnabled = PRICING.pro_lifetime.features.booking;
      advancedStatsEnabled = PRICING.pro_lifetime.features.advancedStats;
      pdfDirectSendEnabled = PRICING.pro_lifetime.features.pdfDirectSend;
    } else if (tier === 'basique') {
      maxEmailsPerMonth = PRICING.basique.maxEmailsPerMonth;
      marketingEnabled = PRICING.basique.features.marketing;
      bookingEnabled = PRICING.basique.features.booking;
      advancedStatsEnabled = PRICING.basique.features.advancedStats;
      pdfDirectSendEnabled = PRICING.basique.features.pdfDirectSend;
    } else if (tier === 'trial') {
      // Trial = version PRO complète pendant 14 jours
      maxEmailsPerMonth = -1; // Illimité pendant trial
      marketingEnabled = true;
      bookingEnabled = true;
      advancedStatsEnabled = true;
      pdfDirectSendEnabled = true;
    }
    
    // ✅ AUTO-CLEANUP: Désactiver les licences Trial existantes si on active une licence payante
    if (tier !== 'trial') {
      const existingTrials = await prisma.license.findMany({
        where: {
          tier: 'trial',
          status: 'active',
        },
      });
      
      if (existingTrials.length > 0) {
        await prisma.license.updateMany({
          where: {
            tier: 'trial',
            status: 'active',
          },
          data: {
            status: 'expired',
          },
        });
        logger.info(`[License Manager] ✅ Deactivated ${existingTrials.length} trial license(s) (new ${tier} license activated)`);
      }
    }
    
    // Créer la licence
    const hardwareId = getHardwareId();
    
    const license = await prisma.license.create({
      data: {
        key,
        tier,
        status: 'active',
        activatedAt: new Date(),
        expiresAt: tier === 'pro_lifetime' ? null : expiryDate,
        hardwareId,
        customerEmail,
        customerName,
        maxEmailsPerMonth,
        emailsThisMonth: 0,
        emailResetDate: new Date(),
        marketingEnabled,
        bookingEnabled,
        advancedStatsEnabled,
        pdfDirectSendEnabled,
        isLifetime,
        maintenanceExpiresAt,
        trialStartedAt: tier === 'trial' ? new Date() : null,
        trialEndsAt: tier === 'trial' ? (() => {
          const end = new Date();
          end.setDate(end.getDate() + PRICING.trial.duration);
          return end;
        })() : null,
      },
    });
    
    return {
      success: true,
      message: `Licence ${tier.toUpperCase()} activée avec succès!`,
      license,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Manager] Activation error:', { error: errorMessage });
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Erreur lors de l'activation: ${message}`,
    };
  }
}

/**
 * Démarre un trial gratuit 14 jours
 */
export async function startTrial(
  customerEmail: string,
  customerName: string
): Promise<{ success: boolean; message: string; license?: License }> {
  try {
    // Vérifier si un trial existe déjà
    const existing = await prisma.license.findFirst({
      where: {
        OR: [
          { customerEmail },
          { tier: 'trial', status: 'active' },
        ],
      },
    });
    
    if (existing) {
      return {
        success: false,
        message: 'Un trial ou une licence existe déjà pour cet utilisateur.',
      };
    }
    
    // ⚠️ MODIFIÉ: Créer trial directement sans clé RSA (pour compatibilité)
    // Pour sécurité maximale, utilisez une clé trial générée via le générateur
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + PRICING.trial.duration);
    
    const hardwareId = getHardwareId();
    
    const license = await prisma.license.create({
      data: {
        key: `TRIAL-${Date.now()}`, // Clé temporaire (non valide pour activation RSA)
        tier: 'trial',
        status: 'active',
        activatedAt: new Date(),
        expiresAt: null, // Trial n'expire pas via expiresAt mais via trialEndsAt
        hardwareId,
        customerEmail,
        customerName,
        maxEmailsPerMonth: -1, // Illimité pendant trial
        emailsThisMonth: 0,
        emailResetDate: new Date(),
        marketingEnabled: true,
        bookingEnabled: true,
        advancedStatsEnabled: true,
        pdfDirectSendEnabled: true,
        isLifetime: false,
        maintenanceExpiresAt: null,
        trialStartedAt: new Date(),
        trialEndsAt: trialEnd,
      },
    });
    
    return {
      success: true,
      message: `Trial gratuit activé pour 14 jours!`,
      license,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Manager] Start trial error:', { error: errorMessage });
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Erreur lors du démarrage du trial: ${message}`,
    };
  }
}

// ============================================
// EMAIL LIMITS (Phase 2.1 - Mensuel)
// ============================================

/**
 * Vérifie si l'utilisateur peut envoyer un email
 */
export async function canSendEmail(): Promise<boolean> {
  try {
    const license = await getActiveLicense();
    
    // ⚠️ CRITIQUE: Pas de licence = BLOQUER envoi emails
    if (!license) {
      logger.warn('[License Manager] No active license found - email sending blocked');
      return false; // Pas de licence = pas d'envoi
    }
    
    // Illimité pour Pro, Pro Lifetime, et Trial
    if (license.maxEmailsPerMonth === -1) {
      return true;
    }
    
    // Vérifier si reset mensuel nécessaire
    await checkAndResetMonthlyEmails(license);
    
    // Recharger après reset potentiel
    const updated = await prisma.license.findUnique({
      where: { id: license.id },
    });
    
    if (!updated) {
      logger.warn('[License Manager] License not found after reset - email sending blocked');
      return false;
    }
    
    const canSend = updated.emailsThisMonth < updated.maxEmailsPerMonth;
    if (!canSend) {
      logger.warn('[License Manager] Email limit reached - email sending blocked');
    }
    return canSend;
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur (DB inaccessible, table n'existe pas), BLOQUER envoi
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Manager] Error checking email limit - BLOCKING:', { error: errorMessage });
    return false; // Bloquer par sécurité
  }
}

/**
 * Incrémente le compteur d'emails
 */
export async function incrementEmailCount(): Promise<void> {
  const license = await getActiveLicense();
  
  if (!license) return;
  
  // Ne pas compter pour les tiers illimités
  if (license.maxEmailsPerMonth === -1) return;
  
  await prisma.license.update({
    where: { id: license.id },
    data: {
      emailsThisMonth: {
        increment: 1,
      },
    },
  });
}

/**
 * Vérifie et reset le compteur mensuel si nécessaire
 */
async function checkAndResetMonthlyEmails(license: { id: string; emailResetDate: Date }): Promise<void> {
  const now = new Date();
  const resetDate = new Date(license.emailResetDate);
  
  // Vérifier si on a changé de mois
  const monthChanged = 
    now.getMonth() !== resetDate.getMonth() || 
    now.getFullYear() !== resetDate.getFullYear();
  
  if (monthChanged) {
    await prisma.license.update({
      where: { id: license.id },
      data: {
        emailsThisMonth: 0,
        emailResetDate: now,
      },
    });
  }
}

// ============================================
// FEATURE ACCESS
// ============================================

/**
 * Vérifie l'accès à une fonctionnalité
 */
export async function checkFeatureAccess(feature: string): Promise<boolean> {
  try {
    const licenseInfo = await getLicenseInfo();
    
    // ⚠️ CRITIQUE: Si pas de licence active, bloquer TOUTES les features
    if (!licenseInfo || licenseInfo.tier === 'basique' && licenseInfo.features.pdfDirectSend === false) {
      // Double vérification: si pas de licence ou basique sans features, bloquer
      const license = await getActiveLicense();
      if (!license) {
        logger.warn('[License Manager] No license - blocking feature access', { feature });
        return false;
      }
    }
    
    switch (feature) {
      case 'marketing':
        return licenseInfo.features.marketingCampaigns;
      case 'booking':
        return licenseInfo.features.bookingOnline;
      case 'advancedStats':
        return licenseInfo.features.advancedStats;
      case 'toggles':
        return licenseInfo.features.togglesUnlocked;
      case 'pdfDirectSend':
        return licenseInfo.features.pdfDirectSend;
      default:
        return false;
    }
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur, BLOQUER l'accès par sécurité
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Manager] Error checking feature access - BLOCKING', { feature, error: errorMessage });
    return false; // Bloquer par sécurité
  }
}

// ============================================
// VERIFICATION & MAINTENANCE
// ============================================

/**
 * Vérifie la validité de la licence
 */
export async function verifyLicense(): Promise<{
  valid: boolean;
  tier: LicenseTier;
  status: LicenseStatus;
  message?: string;
}> {
  try {
    const license = await getActiveLicense();
    
    if (!license) {
      // Essayer de créer un trial automatique
      const trialResult = await startTrial('auto@trial.local', 'Auto Trial');
      if (trialResult.success) {
        return {
          valid: true,
          tier: 'trial',
          status: 'active',
          message: '✅ Trial 14 jours démarré automatiquement. Profitez de toutes les fonctionnalités PRO !',
        };
      }
      return {
        valid: false,
        tier: 'trial',
        status: 'expired',
        message: '❌ Aucune licence active. Démarrez un trial gratuit 14 jours pour essayer l\'application.',
      };
    }
    
    // Vérifier expiration
    const now = new Date();
    if (license.expiresAt && license.expiresAt < now) {
      // ⚠️ NOUVEAU: Gérer grace period pour Pro/Basique après expiration
      // Si pas déjà en grace, démarrer grace period de 7 jours
      if (license.status === 'active' && (license.tier === 'pro' || license.tier === 'basique')) {
        const gracePeriodEnds = new Date();
        gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
        
        await prisma.license.update({
          where: { id: license.id },
          data: { 
            status: 'grace',
            gracePeriodEndsAt: gracePeriodEnds,
          },
        });
        
        return {
          valid: true, // Toujours valide pendant grace period
          tier: license.tier as LicenseTier,
          status: 'grace',
          message: `⚠️ Votre licence ${license.tier === 'pro' ? 'Pro' : 'Basique'} a expiré. Grace period de 7 jours activée. Renouvelez avant le ${gracePeriodEnds.toLocaleDateString('fr-FR')} pour éviter le blocage.`,
        };
      }
      
      // Si grace period aussi expirée, bloquer
      if (license.status === 'grace' && license.gracePeriodEndsAt && license.gracePeriodEndsAt < now) {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: 'blocked' }, // ✅ BLOQUER au lieu d'expired
        });
        
        return {
          valid: false,
          tier: license.tier as LicenseTier,
          status: 'blocked', // ✅ Status blocked
          message: `❌ Votre essai gratuit et la grace period (7j) ont expiré. L'application est bloquée. Activez une licence pour continuer.`,
        };
      }
      
      // Si déjà expired, retourner directement
      if (license.status === 'expired') {
        return {
          valid: false,
          tier: license.tier as LicenseTier,
          status: 'expired',
          message: `❌ Votre licence ${license.tier === 'pro' ? 'Pro' : 'Basique'} a expiré. L'application est bloquée. Renouvelez votre licence pour continuer.`,
        };
      }
    }
    
    // Vérifier hardware ID (anti-partage)
    const currentHardwareId = getHardwareId();
    if (license.hardwareId && license.hardwareId !== currentHardwareId) {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: 'suspended' },
      });
      
      return {
        valid: false,
        tier: license.tier as LicenseTier,
        status: 'suspended',
        message: '❌ Cette licence est liée à une autre machine. Si vous avez changé d\'ordinateur, contactez le support pour transférer votre licence.',
      };
    }
    
    // Vérifier maintenance Lifetime (après 3 ans)
    if (license.tier === 'pro_lifetime' && license.maintenanceExpiresAt && license.maintenanceExpiresAt < now) {
      // Lifetime continue de fonctionner, mais support prioritaire terminé
      // Pas de blocage, juste un avertissement
      return {
        valid: true,
        tier: license.tier as LicenseTier,
        status: license.status as LicenseStatus,
        message: `⚠️ Votre licence Pro Lifetime est active à vie, mais le support prioritaire a pris fin le ${license.maintenanceExpiresAt.toLocaleDateString('fr-FR')}. L'application continue de fonctionner normalement.`,
      };
    }
    
    // Mettre à jour lastVerified
    await prisma.license.update({
      where: { id: license.id },
      data: { lastVerified: now },
    });
    
    // Logger la vérification
    await prisma.licenseVerification.create({
      data: {
        licenseId: license.id,
        verificationType: 'manual',
        status: 'success',
        responseCode: '200',
      },
    });
    
    // Construire message de succès avec détails
    let successMessage = '✅ Licence valide';
    
    if (license.tier === 'trial' && license.trialEndsAt) {
      const daysRemaining = Math.ceil((license.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      successMessage = `✅ Essai gratuit actif - ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`;
    } else if (license.status === 'grace' && license.gracePeriodEndsAt) {
      const daysRemaining = Math.ceil((license.gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      successMessage = `⚠️ Grace period active - ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} avant blocage. Renouvelez pour éviter l'interruption.`;
    } else if (license.expiresAt && license.expiresAt > now) {
      const daysRemaining = Math.ceil((license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 7) {
        successMessage = `⚠️ Licence ${license.tier === 'pro' ? 'Pro' : 'Basique'} expire dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}. Renouvelez pour éviter l'interruption.`;
      } else {
        successMessage = `✅ Licence ${license.tier === 'pro' ? 'Pro' : 'Basique'} valide jusqu'au ${license.expiresAt.toLocaleDateString('fr-FR')}`;
      }
    } else if (license.tier === 'pro_lifetime') {
      if (license.maintenanceExpiresAt && license.maintenanceExpiresAt > now) {
        const daysRemaining = Math.ceil((license.maintenanceExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          successMessage = `⚠️ Support prioritaire Pro Lifetime se termine dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}. L'application continue de fonctionner à vie.`;
        } else {
          successMessage = `✅ Licence Pro Lifetime active (support prioritaire jusqu'au ${license.maintenanceExpiresAt.toLocaleDateString('fr-FR')})`;
        }
      } else {
        successMessage = '✅ Licence Pro Lifetime active à vie (support prioritaire terminé)';
      }
    }
    
    return {
      valid: true,
      tier: license.tier as LicenseTier,
      status: license.status as LicenseStatus,
      message: successMessage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Manager] Verification error:', { error: errorMessage });
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      tier: 'trial',
      status: 'expired',
      message: `❌ Erreur lors de la vérification de la licence: ${message}. Contactez le support si le problème persiste.`,
    };
  }
}

/**
 * Gère les trials expirés : Grace Period (7j) puis Blocked
 * À appeler par un cron job quotidien
 * 
 * Logique:
 * 1. Trial expiré → Grace Period (7 jours) - Accès complet
 * 2. Grace Period expiré → Application bloquée (status: blocked)
 */
export async function checkAndDowngradeExpiredTrials(): Promise<{ downgraded: number; blocked: number }> {
  try {
    const now = new Date();
    
    // 1. Trials expirés → Passer en Grace Period (7 jours)
    const expiredTrials = await prisma.license.findMany({
      where: {
        tier: 'trial',
        status: 'active',
        trialEndsAt: {
          lt: now,
        },
      },
    });
    
    let downgraded = 0;
    
    for (const trial of expiredTrials) {
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 jours de grâce
      
      await prisma.license.update({
        where: { id: trial.id },
        data: {
          status: 'grace', // Passer en grace period
          gracePeriodEndsAt: gracePeriodEnd,
        },
      });
      downgraded++;
      logger.info(`[License Manager] ✅ Trial ${trial.key} expired → Grace Period (7 days until ${gracePeriodEnd.toLocaleDateString('fr-FR')})`);
    }
    
    // 2. Grace Periods expirés → Bloquer l'application
    const expiredGrace = await prisma.license.findMany({
      where: {
        tier: 'trial',
        status: 'grace',
        gracePeriodEndsAt: {
          lt: now,
        },
      },
    });
    
    let blocked = 0;
    
    for (const grace of expiredGrace) {
      await prisma.license.update({
        where: { id: grace.id },
        data: {
          status: 'blocked', // Bloquer l'application
        },
      });
      blocked++;
      logger.info(`[License Manager] ❌ Grace Period ${grace.key} expired → Application BLOCKED`);
    }
    
    if (downgraded > 0 || blocked > 0) {
      logger.info(`[License Manager] 📊 Processed: ${downgraded} trial→grace, ${blocked} grace→blocked`);
    }
    
    return { downgraded, blocked };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Manager] Downgrade trials error:', { error: errorMessage });
    return { downgraded: 0, blocked: 0 };
  }
}
