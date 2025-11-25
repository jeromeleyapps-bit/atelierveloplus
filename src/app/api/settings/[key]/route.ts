import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  // Removed getPrisma() - using direct import
  const row = await prisma.globalSetting.findUnique({ where: { key } });
  return NextResponse.json({ key, value: row?.value ?? null }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const value = body.value ?? null;
  await prisma.globalSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json({ key, value }, { status: 200 });
}
