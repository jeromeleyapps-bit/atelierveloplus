import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface IncomingLine {
  type?: string;
  description?: string;
  quantity?: number;
  priceHT?: number;
  vatRate?: number;
  duration?: number | null;
}

export async function GET() {
  const packages = await prisma.servicePackage.findMany({
    where: { active: true },
    include: { lines: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ packages });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

    const lines: IncomingLine[] = Array.isArray(body.lines) ? body.lines : [];

    const created = await prisma.servicePackage.create({
      data: {
        name,
        description: typeof body.description === 'string' ? body.description : null,
        lines: {
          create: lines
            .filter(l => l.description)
            .map(l => ({
              type: l.type === 'labor' ? 'labor' : 'part',
              description: String(l.description),
              quantity: Number(l.quantity) || 1,
              priceHT: Number(l.priceHT) || 0,
              vatRate: l.vatRate != null ? Number(l.vatRate) : 20,
              duration: l.duration != null ? Number(l.duration) : null,
            })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json({ package: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[service-packages] create failed', { error: msg });
    return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 500 });
  }
}
