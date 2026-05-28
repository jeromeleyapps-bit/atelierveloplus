import { NextResponse } from 'next/server';
import path from 'path';
import { restoreBackup } from '@/lib/backup-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de restauration. ATTENTION : doit être orchestré côté Electron main process
 * (Prisma déconnecté avant restauration, puis relance de l'app).
 * Côté Next standalone seul, ça remplacera le fichier DB mais Prisma gardera l'ancien handle.
 */
export async function POST(req: Request) {
  try {
    const { filename } = await req.json();
    if (!filename || typeof filename !== 'string' || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'invalid_filename' }, { status: 400 });
    }

    const dbPath = (() => {
      const url = process.env.DATABASE_URL || '';
      const m = url.match(/^file:(.+)$/);
      if (!m) throw new Error('cannot_resolve_db_path');
      const raw = m[1];
      return path.isAbsolute(raw) ? raw : path.join(process.cwd(), 'prisma', raw);
    })();

    await restoreBackup(filename, dbPath);
    return NextResponse.json({ ok: true, message: 'Restauration appliquée. Relance Atelier Vélo+ pour prendre en compte.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[admin/backups/restore] failed', { error: msg });
    return NextResponse.json({ error: 'restore_failed', detail: msg }, { status: 500 });
  }
}
