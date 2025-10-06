import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const rows = await prisma.supplierItem.findMany({ where: { catalogItemId: params.id }, orderBy: { lastCheckedAt: 'desc' } });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const supplierId = String(body.supplierId || '');
  const supplierSku = String(body.supplierSku || '').trim();
  const ean = body.ean ? String(body.ean) : undefined;
  if (!supplierId || !supplierSku) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const sup = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!sup) return NextResponse.json({ error: 'supplier_not_found' }, { status: 404 });
  const existing = await prisma.supplierItem.findFirst({ where: { supplierId, catalogItemId: params.id } });
  const saved = existing
    ? await prisma.supplierItem.update({ where: { id: existing.id }, data: { supplierSku, ean } })
    : await prisma.supplierItem.create({ data: { supplierId, catalogItemId: params.id, supplierSku, ean } });
  return NextResponse.json(saved, { status: 200 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  // Accept link id via body or query ?linkId=
  let linkId: string | null = null;
  const url = new URL(req.url);
  const qid = url.searchParams.get('linkId');
  if (qid) linkId = qid;
  if (!linkId) {
    try {
      const body = await req.json();
      if (body && body.id) linkId = String(body.id);
    } catch {}
  }
  if (!linkId) return NextResponse.json({ error: 'missing_link_id' }, { status: 400 });
  const link = await prisma.supplierItem.findUnique({ where: { id: linkId } });
  if (!link || link.catalogItemId !== params.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.supplierItem.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const linkId = body?.id ? String(body.id) : null;
  const favorite = Boolean(body?.favorite);
  if (!linkId) return NextResponse.json({ error: 'missing_link_id' }, { status: 400 });
  const link = await prisma.supplierItem.findUnique({ where: { id: linkId } });
  if (!link || link.catalogItemId !== params.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ops: any[] = [];
  if (favorite) {
    // unset others for this catalog item
    ops.push(prisma.supplierItem.updateMany({ where: { catalogItemId: params.id, id: { not: linkId } }, data: { favorite: false } }));
  }
  ops.push(prisma.supplierItem.update({ where: { id: linkId }, data: { favorite } }));
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true }, { status: 200 });
}
