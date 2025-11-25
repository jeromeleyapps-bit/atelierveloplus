import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { MockConnector } from "@/lib/suppliers/mock";
import { FourMyBikeConnector } from "@/lib/suppliers/fourmybike";
import { RCZBikeShopConnector } from "@/lib/suppliers/rcz";
import type { SupplierConnector } from "@/lib/suppliers/base";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  const item = await prisma.catalogItem.findUnique({ where: { id: id } });
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 404 });

  const userId = getUserId(req);
  const supplierItems = await prisma.supplierItem.findMany({ where: { catalogItemId: item.id }, include: { Supplier: true } });
  const credsList = userId ? await prisma.supplierCredential.findMany({ where: { userId } }) : [];

  // Simple registry
  const registry: Record<string, SupplierConnector> = {
    'MOCK': new MockConnector(),
    'FOURMYBIKE': new FourMyBikeConnector(),
    'RCZBIKESHOP': new RCZBikeShopConnector(),
  };

  const now = new Date();
  for (const si of supplierItems) {
    const supplier = si.Supplier as { id: string; name: string; connectorType: string } | null;
    if (!supplier) continue;
    const connector = registry[supplier.connectorType] || registry['MOCK'];
    const cred = credsList.find(c => c.supplierId === supplier.id) || null;
    try {
      const extra = cred?.extraJson ? JSON.parse(cred.extraJson) : undefined;
      const result = await connector.checkAvailability({ supplier: { id: supplier.id, name: supplier.name, connectorType: supplier.connectorType }, credentials: { username: cred?.username || undefined, password: cred?.password || undefined, extra }, sku: si.supplierSku, ean: si.ean || undefined });
      await prisma.supplierItem.update({
        where: { id: si.id },
        data: {
          lastCheckedAt: now,
          lastAvailability: result.available ?? si.lastAvailability ?? null,
          lastPriceHT: (result.priceHT != null ? result.priceHT : si.lastPriceHT) ?? null,
        },
      });
    } catch (_e) {
      // On erreur connector, on marque seulement la vérif
      await prisma.supplierItem.update({ where: { id: si.id }, data: { lastCheckedAt: now } });
    }
  }

  // Return aggregated offers like GET /offers
  const updated = await prisma.supplierItem.findMany({ where: { catalogItemId: item.id }, include: { Supplier: true } });
  const offers = updated.map(si => ({
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
