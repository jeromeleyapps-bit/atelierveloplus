import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const row = await prisma.supplierCredential.findFirst({ where: { supplierId: id, userId } });
  return NextResponse.json(row || {}, { status: 200 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const username = body.username ? String(body.username) : undefined;
  const password = body.password ? String(body.password) : undefined;
  const extraJson = body.extraJson ? String(body.extraJson) : undefined;

  const existing = await prisma.supplierCredential.findFirst({ where: { supplierId: id, userId } });
  const saved = existing
    ? await prisma.supplierCredential.update({ where: { id: existing.id }, data: { username, password, extraJson } })
    : await prisma.supplierCredential.create({ data: { supplierId: id, userId, username, password, extraJson } });

  return NextResponse.json(saved, { status: 200 });
}
