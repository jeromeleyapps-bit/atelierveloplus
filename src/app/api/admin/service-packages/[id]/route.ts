import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Désactive (soft) ou supprime un forfait. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.servicePackage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[service-packages] delete failed', { id, error: msg });
    return NextResponse.json({ error: 'delete_failed', detail: msg }, { status: 500 });
  }
}
