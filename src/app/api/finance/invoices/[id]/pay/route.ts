import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const method = body?.method ? String(body.method) : null;
  const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();
  const inv = await prisma.invoice.update({ where: { id: id }, data: { status: "paid", paidAt, paymentMethod: method } });
  return NextResponse.json(inv, { status: 200 });
}
