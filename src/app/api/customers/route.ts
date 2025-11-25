import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Removed getPrisma() - using direct import
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  type CustomerWithCount = Prisma.CustomerGetPayload<{
    include: { _count: { select: { CustomerBike: true } } }
  }>;
  
  const rows = await prisma.customer.findMany({
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    include: { _count: { select: { CustomerBike: true } } },
  });
  // ✅ FIX: Utiliser CustomerBike (nom de la relation Prisma) au lieu de bikes
  const items = rows.map((r: CustomerWithCount) => ({ ...r, bikesCount: r._count?.CustomerBike ?? 0 }));
  const filtered = q ? items.filter(c =>
    (c.firstName || '').toLowerCase().includes(q) ||
    (c.lastName || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q)
  ) : items;
  return NextResponse.json(filtered.slice(0, 200), { status: 200 });
}

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'customer_create_failed', detail: message }, { status: 500 });
  }
}
