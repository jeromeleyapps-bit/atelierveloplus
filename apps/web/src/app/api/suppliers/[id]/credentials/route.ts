import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const row = await prisma.supplierCredential.findFirst({ where: { supplierId: params.id, userId } });
  return NextResponse.json(row || {}, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const username = body.username ? String(body.username) : undefined;
  const password = body.password ? String(body.password) : undefined;
  const extraJson = body.extraJson ? String(body.extraJson) : undefined;

  const existing = await prisma.supplierCredential.findFirst({ where: { supplierId: params.id, userId } });
  const saved = existing
    ? await prisma.supplierCredential.update({ where: { id: existing.id }, data: { username, password, extraJson } })
    : await prisma.supplierCredential.create({ data: { supplierId: params.id, userId, username, password, extraJson } });

  return NextResponse.json(saved, { status: 200 });
}
