import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const row = await prisma.workOrder.findUnique({ where: { id: id } });
  return NextResponse.json({ id: id, type: row?.type ?? null }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const type = typeof body?.type === 'string' ? String(body.type) : null;
  // Allowed types
  const allowed = new Set(["revision","repair","maintenance","upgrade"]);
  const safeType = type && allowed.has(type) ? type : null;
  const updated = await prisma.workOrder.upsert({
    where: { id: id },
    update: { type: safeType },
    create: { id: id, status: "created", type: safeType },
  });
  return NextResponse.json({ id: updated.id, type: updated.type ?? null }, { status: 200 });
}
