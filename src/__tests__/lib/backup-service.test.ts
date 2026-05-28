/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'atelier-backup-test-'));
process.env.USER_DATA_PATH = tmpDir;

const fakeDbContent = 'SQLite format 3\0fake-db-bytes';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRawUnsafe: jest.fn(async (sql: string) => {
      // Simule VACUUM INTO en écrivant un fichier au chemin extrait du SQL.
      const match = /VACUUM INTO\s+'(.+?)'/.exec(sql);
      if (!match) throw new Error('Unexpected SQL: ' + sql);
      writeFileSync(match[1], fakeDbContent);
    }),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { createBackup, listBackups, restoreBackup } from '@/lib/backup-service';

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('backup-service', () => {
  it('createBackup produit un fichier .db.gz lisible', async () => {
    const info = await createBackup();
    expect(info.filename).toMatch(/^atelier-velo_\d{8}_\d{6}\.db\.gz$/);
    expect(existsSync(info.fullPath)).toBe(true);

    const gz = readFileSync(info.fullPath);
    const plain = zlib.gunzipSync(gz).toString();
    expect(plain).toBe(fakeDbContent);
  });

  it('listBackups renvoie le plus récent en premier', async () => {
    const a = await createBackup();
    await new Promise(r => setTimeout(r, 1100)); // garantir un timestamp différent
    const b = await createBackup();
    const list = await listBackups();
    const ours = list.filter(x => x.filename === a.filename || x.filename === b.filename);
    expect(ours[0].filename).toBe(b.filename);
  });

  it('rotate supprime les backups au-delà de la limite', async () => {
    // crée 3 backups puis rotate à 2
    await createBackup(2);
    await new Promise(r => setTimeout(r, 1100));
    await createBackup(2);
    await new Promise(r => setTimeout(r, 1100));
    await createBackup(2);
    const list = await listBackups();
    expect(list.length).toBeLessThanOrEqual(2);
  });

  it('restoreBackup décompresse et écrit le fichier cible', async () => {
    const info = await createBackup();
    const targetPath = path.join(tmpDir, 'restored.db');
    await restoreBackup(info.filename, targetPath);
    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath).toString()).toBe(fakeDbContent);
  });

  it('restoreBackup refuse les noms avec slash (sécurité)', async () => {
    await expect(restoreBackup('../etc/passwd', '/tmp/x')).rejects.toBeDefined();
  });
});

// Empêche un suite vide en cas d'évaluation partielle
expect.assertions = expect.assertions ?? (() => {});
