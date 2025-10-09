import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const row = await prisma.catalogItem.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  try {
    const body = await req.json();
    const updated = await prisma.catalogItem.update({ where: { id: params.id }, data: body });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'catalog/items/PUT');
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  try {
    await prisma.catalogItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'catalog/items/DELETE');
  }
}
