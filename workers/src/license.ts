/**
 * Génération de clés de licence côté Worker.
 * Réplique de src/lib/license-generator-server.ts mais en API Web Crypto (pas Node).
 */
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
  pro_lifetime: null,
};

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, '\n');
  const b64 = normalized
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function bytesToHex(arr: ArrayBuffer): string {
  return Array.from(new Uint8Array(arr))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function computeExpiry(tier: Tier): { expirySegment: string; expiryDate: Date | null } {
  const days = TIER_DURATION_DAYS[tier];
  if (days === null) return { expirySegment: '0000', expiryDate: null };
  const expiry = new Date();
  expiry.setUTCDate(expiry.getUTCDate() + days);
  const mm = String(expiry.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(expiry.getUTCFullYear()).slice(-2);
  return { expirySegment: `${mm}${yy}`, expiryDate: expiry };
}

export interface GeneratedLicense {
  key: string;
  tier: Tier;
  hardwareId: string;
  expiryDate: Date | null;
}

export async function generateLicense(
  tier: Tier,
  hardwareId: string,
  privateKeyPem: string,
): Promise<GeneratedLicense> {
  const prefix = TIER_PREFIX[tier];
  if (!prefix) throw new Error(`Unknown tier: ${tier}`);
  if (!hardwareId || hardwareId.length < 16) {
    throw new Error('hardwareId must be at least 16 chars');
  }
  const hwid = hardwareId.substring(0, 16).toUpperCase();
  const randomSegment = randomHex(2);
  const { expirySegment, expiryDate } = computeExpiry(tier);
  const dataToSign = `${prefix}-${randomSegment}-${expirySegment}-${hwid}`;

  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(dataToSign),
  );
  const signature = bytesToHex(sig);

  return {
    key: `${prefix}-${randomSegment}-${expirySegment}-${hwid}-${signature}`,
    tier,
    hardwareId: hwid,
    expiryDate,
  };
}
