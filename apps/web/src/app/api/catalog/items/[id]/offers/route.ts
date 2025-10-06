import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Mock offers aggregator: returns last known SupplierItem data for the item id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const item = await prisma.catalogItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

  const supplierItems = await prisma.supplierItem.findMany({ where: { catalogItemId: item.id }, include: { supplier: true } });
  const offers = supplierItems.map(si => ({
    id: si.id,
    supplierId: si.supplierId,
    supplierName: (si as any).supplier?.name || 'Fournisseur',
    supplierSku: si.supplierSku,
    ean: si.ean || null,
    lastPriceHT: si.lastPriceHT ?? null,
    lastAvailability: si.lastAvailability ?? null,
    lastCheckedAt: si.lastCheckedAt ?? null,
    favorite: si.favorite ?? false,
  }));
  return NextResponse.json({ itemId: item.id, offers }, { status: 200 });
}
