import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function nextReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ACO-${year}-`;
  const last = await prisma.deposit.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });
  const n = last ? parseInt(last.receiptNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deposits = await prisma.deposit.findMany({
    where: { workOrderId: id },
    orderBy: { createdAt: 'desc' },
  });
  const total = deposits.filter(d => !d.refunded).reduce((s, d) => s + d.amount, 0);
  return NextResponse.json({ deposits, total });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    }
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) return NextResponse.json({ error: 'workorder_not_found' }, { status: 404 });

    const receiptNumber = await nextReceiptNumber();
    const deposit = await prisma.deposit.create({
      data: {
        workOrderId: id,
        amount,
        method: typeof body.method === 'string' ? body.method : null,
        note: typeof body.note === 'string' ? body.note : null,
        receiptNumber,
      },
    });
    return NextResponse.json({ deposit }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[deposits] create failed', { id, error: msg });
    return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 500 });
  }
}
