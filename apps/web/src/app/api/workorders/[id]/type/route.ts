import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const row = await prisma.workOrder.findUnique({ where: { id: params.id } });
  return NextResponse.json({ id: params.id, type: row?.type ?? null }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const type = typeof body?.type === 'string' ? String(body.type) : null;
  // Allowed types
  const allowed = new Set(["revision","repair","maintenance","upgrade"]);
  const safeType = type && allowed.has(type) ? type : null;
  const updated = await prisma.workOrder.upsert({
    where: { id: params.id },
    update: { type: safeType },
    create: { id: params.id, status: "created", type: safeType },
  });
  return NextResponse.json({ id: updated.id, type: updated.type ?? null }, { status: 200 });
}
