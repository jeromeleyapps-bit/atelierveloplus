import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Mock offers aggregator: returns last known SupplierItem data for the item id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const item = await prisma.catalogItem.findUnique({ where: { id: id } });
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

  const supplierItems = await prisma.supplierItem.findMany({ where: { catalogItemId: id }, include: { Supplier: true } });
  const offers = supplierItems.map(si => ({
    id: si.id,
    supplierId: si.supplierId,
    supplierName: (si as { Supplier?: { name: string } | null }).Supplier?.name || 'Fournisseur',
    supplierSku: si.supplierSku,
    ean: si.ean || null,
    lastPriceHT: si.lastPriceHT ?? null,
    lastAvailability: si.lastAvailability ?? null,
    lastCheckedAt: si.lastCheckedAt ?? null,
    favorite: si.favorite ?? false,
  }));
  return NextResponse.json({ itemId: item.id, offers }, { status: 200 });
}
