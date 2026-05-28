/**
 * @jest-environment node
 */
import { generateLicense } from '@/lib/license-generator-server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const tmpKeyPath = path.join(os.tmpdir(), `atelier-test-key-${Date.now()}.pem`);

beforeAll(() => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  fs.writeFileSync(tmpKeyPath, privateKey);
  process.env.LICENSE_PRIVATE_KEY_PATH = tmpKeyPath;
});

afterAll(() => {
  try { fs.unlinkSync(tmpKeyPath); } catch { /* ignore */ }
  delete process.env.LICENSE_PRIVATE_KEY_PATH;
});

const HW = 'ABCDEF1234567890';

describe('generateLicense', () => {
  it('produit une clé au format AVXX-XXXX-XXXX-HWID-512hex', () => {
    const result = generateLicense('pro', HW);
    const parts = result.key.split('-');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('AVPR');
    expect(parts[1]).toMatch(/^[0-9A-F]{4}$/);
    expect(parts[2]).toMatch(/^\d{4}$/);
    expect(parts[3]).toBe(HW);
    expect(parts[4]).toMatch(/^[0-9a-f]{512}$/);
  });

  it('positionne le tier prefix correct (basique=AVBS, pro=AVPR, pro_lifetime=AVPL)', () => {
    expect(generateLicense('basique', HW).key.startsWith('AVBS-')).toBe(true);
    expect(generateLicense('pro', HW).key.startsWith('AVPR-')).toBe(true);
    expect(generateLicense('pro_lifetime', HW).key.startsWith('AVPL-')).toBe(true);
  });

  it('expiry segment vaut 0000 pour pro_lifetime', () => {
    const result = generateLicense('pro_lifetime', HW);
    expect(result.key.split('-')[2]).toBe('0000');
    expect(result.expiryDate).toBeNull();
  });

  it('renvoie une date d\'expiration ~365j pour pro', () => {
    const result = generateLicense('pro', HW);
    expect(result.expiryDate).toBeInstanceOf(Date);
    const days = Math.round(((result.expiryDate?.getTime() ?? 0) - Date.now()) / 86400000);
    expect(days).toBeGreaterThanOrEqual(364);
    expect(days).toBeLessThanOrEqual(366);
  });

  it('rejette un hardwareId court', () => {
    expect(() => generateLicense('pro', 'TOO_SHORT')).toThrow();
  });

  it('rejette un tier inconnu', () => {
    expect(() =>
      generateLicense('bogus' as unknown as Parameters<typeof generateLicense>[0], HW),
    ).toThrow();
  });
});
