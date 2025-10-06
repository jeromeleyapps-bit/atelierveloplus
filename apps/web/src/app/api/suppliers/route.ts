import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function GET() {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const rows = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const website = body.website ? String(body.website) : undefined;
  const connectorType = body.connectorType ? String(body.connectorType) : 'MOCK';
  const username = body.username ? String(body.username) : undefined;
  const password = body.password ? String(body.password) : undefined;
  const extraJson = body.extraJson ? String(body.extraJson) : undefined;
  if (!name) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const userId = getUserId(req);
  const created = await prisma.$transaction(async (tx) => {
    const sup = await tx.supplier.create({ data: { name, website, connectorType } });
    if (userId && (username || password || extraJson)) {
      // Create or update credentials for current user
      const existing = await tx.supplierCredential.findFirst({ where: { supplierId: sup.id, userId } });
      if (existing) {
        await tx.supplierCredential.update({ where: { id: existing.id }, data: { username, password, extraJson } });
      } else {
        await tx.supplierCredential.create({ data: { supplierId: sup.id, userId, username, password, extraJson } });
      }
    }
    return sup;
  });
  return NextResponse.json(created, { status: 201 });
}
