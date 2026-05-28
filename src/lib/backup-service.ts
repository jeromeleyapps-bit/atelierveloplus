/**
 * Sauvegarde / restauration SQLite locale (Electron).
 *
 * Stratégie : `VACUUM INTO` produit un snapshot cohérent sans verrouiller la DB, puis
 * compression gzip + horodatage. Rotation : on garde les N derniers fichiers (défaut 30).
 *
 * Le fichier produit est autonome — utilisable sur n'importe quelle install Atelier Vélo+.
 */
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { prisma } from './prisma';
import { logger } from './logger';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface BackupInfo {
  filename: string;
  fullPath: string;
  sizeBytes: number;
  createdAt: Date;
}

function backupDir(): string {
  const base = process.env.USER_DATA_PATH || process.cwd();
  return path.join(base, 'backups');
}

async function ensureBackupDir(): Promise<string> {
  const dir = backupDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Crée une sauvegarde compressée. Renvoie le chemin du fichier produit.
 */
export async function createBackup(retainLast = 30): Promise<BackupInfo> {
  const dir = await ensureBackupDir();
  const tmpPath = path.join(dir, `tmp-${timestamp()}.db`);
  const finalName = `atelier-velo_${timestamp()}.db.gz`;
  const finalPath = path.join(dir, finalName);

  try {
    // VACUUM INTO : snapshot cohérent, pas de verrou exclusif.
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tmpPath.replace(/'/g, "''")}'`);

    const dbBytes = await fs.readFile(tmpPath);
    const gz = await gzip(dbBytes);
    await fs.writeFile(finalPath, gz);
    await fs.unlink(tmpPath);

    const stat = await fs.stat(finalPath);
    logger.info('[backup] Created', { file: finalName, size: stat.size });

    await rotate(dir, retainLast);

    return {
      filename: finalName,
      fullPath: finalPath,
      sizeBytes: stat.size,
      createdAt: new Date(),
    };
  } catch (e) {
    try { await fs.unlink(tmpPath); } catch { /* tmp may not exist */ }
    throw e;
  }
}

async function rotate(dir: string, retainLast: number): Promise<void> {
  const all = await listBackups();
  const toDelete = all.slice(retainLast);
  for (const b of toDelete) {
    try {
      await fs.unlink(b.fullPath);
      logger.info('[backup] Rotated out', { file: b.filename });
    } catch (e) {
      logger.warn('[backup] Failed to delete during rotation', { file: b.filename, error: String(e) });
    }
  }
  void dir;
}

export async function listBackups(): Promise<BackupInfo[]> {
  const dir = await ensureBackupDir();
  const names = await fs.readdir(dir);
  const backups: BackupInfo[] = [];
  for (const n of names) {
    if (!n.endsWith('.db.gz')) continue;
    const full = path.join(dir, n);
    const stat = await fs.stat(full);
    backups.push({
      filename: n,
      fullPath: full,
      sizeBytes: stat.size,
      createdAt: stat.mtime,
    });
  }
  // tri du plus récent au plus ancien
  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Restaure une sauvegarde. Le fichier de DB courant doit être fermé par Prisma avant
 * d'appeler cette fonction (à orchestrer côté Electron main process avec relance).
 *
 * @param backupFilename nom du fichier dans le dossier backups/
 * @param targetDbPath chemin absolu de la DB à écraser
 */
export async function restoreBackup(backupFilename: string, targetDbPath: string): Promise<void> {
  const dir = await ensureBackupDir();
  const src = path.join(dir, backupFilename);
  if (!src.startsWith(dir)) {
    throw new Error('invalid_backup_path');
  }
  const stat = await fs.stat(src).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error('backup_not_found');
  }

  const gz = await fs.readFile(src);
  const dbBytes = await gunzip(gz);

  // Sauvegarde de précaution de la DB courante avant écrasement
  const safetyName = `${targetDbPath}.before-restore-${timestamp()}.bak`;
  try {
    await fs.copyFile(targetDbPath, safetyName);
  } catch {
    // Si la DB cible n'existe pas, c'est OK.
  }

  await fs.writeFile(targetDbPath, dbBytes);
  logger.info('[backup] Restored', { from: backupFilename, to: targetDbPath, safety: safetyName });
}
