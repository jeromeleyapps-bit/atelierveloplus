import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildFec } from '@/lib/fec-export';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exports/fec?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Renvoie un FEC conforme art. A47 A-1 LPF, encodage UTF-8.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!from || !to) {
      return NextResponse.json({ error: 'missing_dates' }, { status: 400 });
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 });
    }
    if (fromDate > toDate) {
      return NextResponse.json({ error: 'from_after_to' }, { status: 400 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        type: { in: ['invoice', 'credit'] },
        status: { not: 'draft' },
        OR: [
          { issueDate: { gte: fromDate, lte: toDate } },
          { issueDate: null, createdAt: { gte: fromDate, lte: toDate } },
        ],
      },
      include: { InvoiceLine: true },
      orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const periodLabel = `${from}_${to}`;
    const csv = buildFec({ invoices, periodLabel });
    const filename = `FEC_${periodLabel}.txt`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[fec] Export failed', { error: msg });
    return NextResponse.json({ error: 'fec_export_failed', detail: msg }, { status: 500 });
  }
}
