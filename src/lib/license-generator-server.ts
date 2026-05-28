/**
 * Génération de clés de licence côté serveur (extrait de license-generator/generate-license.js).
 *
 * SÉCURITÉ : Charge la clé privée RSA depuis `license-generator/private-key.pem`.
 * Le fichier ne doit JAMAIS être commité ni embarqué dans la dist Electron.
 * En production, le webhook/endpoint redeem doit tourner sur un serveur séparé de l'app cliente.
 *
 * Format clé : `PREFIX-RANDOM4-MMYY-HWID16-SIGNATURE512` (séparé par tirets).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type Tier = 'trial' | 'basique' | 'pro' | 'pro_lifetime';

const TIER_PREFIX: Record<Tier, string> = {
  trial: 'AVTR',
  basique: 'AVBS',
  pro: 'AVPR',
  pro_lifetime: 'AVPL',
};

const TIER_DURATION_DAYS: Record<Tier, number | null> = {
  trial: 14,
  basique: 365,
  pro: 365,
  pro_lifetime: null, // pas d'expiration
};

let cachedPrivateKey: string | null = null;

function loadPrivateKey(): string {
  if (cachedPrivateKey) return cachedPrivateKey;
  const envKey = process.env.LICENSE_PRIVATE_KEY_PEM;
  if (envKey) {
    cachedPrivateKey = envKey.replace(/\\n/g, '\n');
    return cachedPrivateKey;
  }
  const filePath = process.env.LICENSE_PRIVATE_KEY_PATH
    || path.join(process.cwd(), 'license-generator', 'private-key.pem');
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `License private key not found at ${filePath}. ` +
      `Set LICENSE_PRIVATE_KEY_PATH or LICENSE_PRIVATE_KEY_PEM env var.`
    );
  }
  cachedPrivateKey = fs.readFileSync(filePath, 'utf8');
  return cachedPrivateKey;
}

function signRsa(data: string): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(loadPrivateKey(), 'hex');
}

function computeExpiry(tier: Tier): { expirySegment: string; expiryDate: Date | null } {
  const days = TIER_DURATION_DAYS[tier];
  if (days === null) return { expirySegment: '0000', expiryDate: null };
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  const mm = String(expiry.getMonth() + 1).padStart(2, '0');
  const yy = String(expiry.getFullYear()).slice(-2);
  return { expirySegment: `${mm}${yy}`, expiryDate: expiry };
}

export interface GeneratedLicense {
  key: string;
  tier: Tier;
  hardwareId: string;
  expiryDate: Date | null;
}

export function generateLicense(tier: Tier, hardwareId: string): GeneratedLicense {
  const prefix = TIER_PREFIX[tier];
  if (!prefix) throw new Error(`Unknown tier: ${tier}`);
  if (!hardwareId || hardwareId.length < 16) {
    throw new Error('hardwareId must be at least 16 chars');
  }
  const hwid = hardwareId.substring(0, 16).toUpperCase();
  const randomSegment = crypto.randomBytes(2).toString('hex').toUpperCase();
  const { expirySegment, expiryDate } = computeExpiry(tier);
  const dataToSign = `${prefix}-${randomSegment}-${expirySegment}-${hwid}`;
  const signature = signRsa(dataToSign);
  return {
    key: `${prefix}-${randomSegment}-${expirySegment}-${hwid}-${signature}`,
    tier,
    hardwareId: hwid,
    expiryDate,
  };
}
