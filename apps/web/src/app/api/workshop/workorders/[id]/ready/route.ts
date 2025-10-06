import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const row = await prisma.workOrder.update({ where: { id: params.id }, data: { status: 'ready' } });
  return NextResponse.json(row, { status: 200 });
}
