import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { getStripeMode } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const conn = await prisma.stripeConnection.findUnique({
    where: { userId },
    select: {
      stripeAccountId: true,
      livemode: true,
      scope: true,
      status: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    mode: getStripeMode(),
    connection: conn,
  });
}

export async function DELETE(req: Request) {
  const userId = await getUserIdOrFirst(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await prisma.stripeConnection.updateMany({
    where: { userId },
    data: { status: 'revoked', updatedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
