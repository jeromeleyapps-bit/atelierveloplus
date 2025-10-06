import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const row = await prisma.globalSetting.findUnique({ where: { key: params.key } });
  return NextResponse.json({ key: params.key, value: row?.value ?? null }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const value = body?.value != null ? String(body.value) : null;
  const existing = await prisma.globalSetting.findUnique({ where: { key: params.key } });
  const saved = existing
    ? await prisma.globalSetting.update({ where: { key: params.key }, data: { value } })
    : await prisma.globalSetting.create({ data: { key: params.key, value } });
  return NextResponse.json({ key: saved.key, value: saved.value ?? null }, { status: 200 });
}
