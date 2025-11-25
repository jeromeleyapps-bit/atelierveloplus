import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const row = await prisma.customer.findUnique({ where: { id: id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  try {
    const data: unknown = {};
    const fields = [
      'email','firstName','lastName','phone',
      'address1','address2','zip','city','country',
      'bikeBrand','bikeModel','nationalFileId',
      'shipAddress1','shipAddress2','shipZip','shipCity','shipCountry',
      'notes'
    ];
    for (const f of fields) if (f in body) data[f] = body[f] ?? null;
    const updated = await prisma.customer.update({ where: { id }, data });
    // Migration automatique: si bikeBrand/model/nationalFileId fournis dans la requête, upsert Vélo 1
    if ('bikeBrand' in body || 'bikeModel' in body || 'nationalFileId' in body) {
      await prisma.customerBike.upsert({
        where: { customerId_index: { customerId: id, index: 1 } },
        update: {
          brand: (body.bikeBrand ?? updated.bikeBrand) ?? null,
          model: (body.bikeModel ?? updated.bikeModel) ?? null,
          nationalFileId: (body.nationalFileId ?? updated.nationalFileId) ?? null,
        },
        create: {
          customerId: id,
          index: 1,
          brand: (body.bikeBrand ?? updated.bikeBrand) ?? null,
          model: (body.bikeModel ?? updated.bikeModel) ?? null,
          nationalFileId: (body.nationalFileId ?? updated.nationalFileId) ?? null,
        },
      }).catch(() => {});
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined;
    logger.error('[API /customers/[id] PATCH] Erreur:', {
      customerId: id,
      error: message,
      code,
      body: body,
    });
    return NextResponse.json({ 
      error: 'customer_update_failed', 
      detail: message,
      code,
    }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  try {
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'customer_delete_failed', detail: message }, { status: 500 });
  }
}
