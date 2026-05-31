import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/workorders/[id]/signature
 * Body:
 *   { type: 'client', dataUrl, name }                       → accord client sur devis
 *   { type: 'intake', dataUrl, name, condition, accessories } → bon de dépôt
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { type, dataUrl } = body;

    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }
    // Garde-fou taille (évite une signature monstrueuse en base).
    if (dataUrl.length > 500_000) {
      return NextResponse.json({ error: 'signature_too_large' }, { status: 400 });
    }

    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (type === 'intake') {
      await prisma.workOrder.update({
        where: { id },
        data: {
          intakeSignature: dataUrl,
          intakeSignedAt: new Date(),
          intakeCondition: typeof body.condition === 'string' ? body.condition : wo.intakeCondition,
          intakeAccessories: typeof body.accessories === 'string' ? body.accessories : wo.intakeAccessories,
          clientSignedName: typeof body.name === 'string' && body.name ? body.name : wo.clientSignedName,
        },
      });
    } else {
      await prisma.workOrder.update({
        where: { id },
        data: {
          clientSignature: dataUrl,
          clientSignedAt: new Date(),
          clientSignedName: typeof body.name === 'string' ? body.name : null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[workorder/signature] failed', { id, error: msg });
    return NextResponse.json({ error: 'signature_save_failed', detail: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  try {
    await prisma.workOrder.update({
      where: { id },
      data: type === 'intake'
        ? { intakeSignature: null, intakeSignedAt: null }
        : { clientSignature: null, clientSignedAt: null, clientSignedName: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'delete_failed', detail: msg }, { status: 500 });
  }
}
