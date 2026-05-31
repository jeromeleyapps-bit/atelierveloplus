import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workorders/[id]/apply-package  { packageId }
 * Déverse les lignes d'un forfait dans le bon de travail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { packageId } = await req.json();
    if (!packageId) return NextResponse.json({ error: 'package_required' }, { status: 400 });

    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) return NextResponse.json({ error: 'workorder_not_found' }, { status: 404 });

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: packageId },
      include: { lines: true },
    });
    if (!pkg) return NextResponse.json({ error: 'package_not_found' }, { status: 404 });

    if (pkg.lines.length > 0) {
      await prisma.workOrderLine.createMany({
        data: pkg.lines.map(l => ({
          workOrderId: id,
          type: l.type,
          description: l.description,
          quantity: l.quantity,
          priceHT: l.priceHT,
          vatRate: l.vatRate,
          duration: l.duration,
          sourceId: `package:${pkg.id}`,
        })),
      });
    }

    return NextResponse.json({ ok: true, linesAdded: pkg.lines.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[workorder/apply-package] failed', { id, error: msg });
    return NextResponse.json({ error: 'apply_failed', detail: msg }, { status: 500 });
  }
}
