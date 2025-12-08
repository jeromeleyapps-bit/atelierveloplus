import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const rows = await prisma.supplierItem.findMany({ where: { catalogItemId: id }, orderBy: { lastCheckedAt: 'desc' } });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const supplierId = String(body.supplierId || '');
  const supplierSku = String(body.supplierSku || '').trim();
  const ean = body.ean ? String(body.ean) : undefined;
  if (!supplierId || !supplierSku) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const sup = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!sup) return NextResponse.json({ error: 'supplier_not_found' }, { status: 404 });
  const existing = await prisma.supplierItem.findFirst({ where: { supplierId, catalogItemId: id } });
  const saved = existing
    ? await prisma.supplierItem.update({ where: { id: existing.id }, data: { supplierSku, ean } })
    : await prisma.supplierItem.create({ data: { supplierId, catalogItemId: id, supplierSku, ean } });
  return NextResponse.json(saved, { status: 200 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
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
  if (!link || link.catalogItemId !== id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.supplierItem.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const linkId = body?.id ? String(body.id) : null;
  const favorite = Boolean(body?.favorite);
  if (!linkId) return NextResponse.json({ error: 'missing_link_id' }, { status: 400 });
  const link = await prisma.supplierItem.findUnique({ where: { id: linkId } });
  if (!link || link.catalogItemId !== id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (favorite) {
    // unset others for this catalog item
    await prisma.supplierItem.updateMany({ where: { catalogItemId: id, id: { not: linkId } }, data: { favorite: false } });
  }
  await prisma.supplierItem.update({ where: { id: linkId }, data: { favorite } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
