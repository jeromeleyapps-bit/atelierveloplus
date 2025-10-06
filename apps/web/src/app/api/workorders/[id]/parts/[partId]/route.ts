import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string; partId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  try {
    const data: any = {};
    for (const k of ["catalogItemId","description","qty","priceHT","note"]) if (k in body) data[k] = body[k];
    const saved = await prisma.workOrderPart.update({ where: { id: params.partId }, data });
    return NextResponse.json(saved, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'part_update_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; partId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  try {
    await prisma.workOrderPart.delete({ where: { id: params.partId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'part_delete_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
