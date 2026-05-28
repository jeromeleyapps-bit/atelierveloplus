import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: { status: true, customerEmail: true, tier: true },
  });
  if (!order) {
    return NextResponse.json({ status: 'unknown' }, { status: 404 });
  }
  return NextResponse.json(order);
}
