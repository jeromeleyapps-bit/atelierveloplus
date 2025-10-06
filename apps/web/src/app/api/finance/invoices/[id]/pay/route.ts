import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const method = body?.method ? String(body.method) : null;
  const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();
  const inv = await prisma.invoice.update({ where: { id: params.id }, data: { status: "paid", paidAt, paymentMethod: method } });
  return NextResponse.json(inv, { status: 200 });
}
