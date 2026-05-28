import { NextResponse } from 'next/server';
import { createBackup, listBackups } from '@/lib/backup-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await listBackups();
    return NextResponse.json({
      backups: list.map(b => ({
        filename: b.filename,
        sizeBytes: b.sizeBytes,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[admin/backups] list failed', { error: msg });
    return NextResponse.json({ error: 'list_failed', detail: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const info = await createBackup();
    return NextResponse.json({
      filename: info.filename,
      sizeBytes: info.sizeBytes,
      createdAt: info.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[admin/backups] create failed', { error: msg });
    return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 500 });
  }
}
