import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const rows = await prisma.customer.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { bikes: true } } },
  });
  const items = rows.map((r: any) => ({ ...r, bikesCount: r._count?.bikes ?? 0 }));
  const filtered = q ? items.filter(c =>
    (c.firstName || '').toLowerCase().includes(q) ||
    (c.lastName || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q)
  ) : items;
  return NextResponse.json(filtered.slice(0, 200), { status: 200 });
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json();
  try {
    const created = await prisma.customer.create({ data: {
      email: body.email || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      phone: body.phone || null,
      address1: body.address1 || null,
      address2: body.address2 || null,
      zip: body.zip || null,
      city: body.city || null,
      country: body.country || null,
      bikeBrand: body.bikeBrand || null,
      bikeModel: body.bikeModel || null,
      nationalFileId: body.nationalFileId || null,
      shipAddress1: body.shipAddress1 || null,
      shipAddress2: body.shipAddress2 || null,
      shipZip: body.shipZip || null,
      shipCity: body.shipCity || null,
      shipCountry: body.shipCountry || null,
      notes: body.notes || null,
    }});
    // Migration automatique: si des infos vélo sont fournies, créer/mettre à jour Vélo 1
    if (body.bikeBrand || body.bikeModel || body.nationalFileId) {
      await prisma.customerBike.upsert({
        where: { customerId_index: { customerId: created.id, index: 1 } },
        update: {
          brand: body.bikeBrand || null,
          model: body.bikeModel || null,
          nationalFileId: body.nationalFileId || null,
        },
        create: {
          customerId: created.id,
          index: 1,
          brand: body.bikeBrand || null,
          model: body.bikeModel || null,
          nationalFileId: body.nationalFileId || null,
        },
      });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'customer_create_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
