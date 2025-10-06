import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const row = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  try {
    const data: any = {};
    const fields = [
      'email','firstName','lastName','phone',
      'address1','address2','zip','city','country',
      'bikeBrand','bikeModel','nationalFileId',
      'shipAddress1','shipAddress2','shipZip','shipCity','shipCountry',
      'notes'
    ];
    for (const f of fields) if (f in body) data[f] = body[f] ?? null;
    const updated = await prisma.customer.update({ where: { id: params.id }, data });
    // Migration automatique: si bikeBrand/model/nationalFileId fournis dans la requête, upsert Vélo 1
    if ('bikeBrand' in body || 'bikeModel' in body || 'nationalFileId' in body) {
      await prisma.customerBike.upsert({
        where: { customerId_index: { customerId: params.id, index: 1 } },
        update: {
          brand: (body.bikeBrand ?? updated.bikeBrand) ?? null,
          model: (body.bikeModel ?? updated.bikeModel) ?? null,
          nationalFileId: (body.nationalFileId ?? updated.nationalFileId) ?? null,
        },
        create: {
          customerId: params.id,
          index: 1,
          brand: (body.bikeBrand ?? updated.bikeBrand) ?? null,
          model: (body.bikeModel ?? updated.bikeModel) ?? null,
          nationalFileId: (body.nationalFileId ?? updated.nationalFileId) ?? null,
        },
      }).catch(() => {});
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'customer_update_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
