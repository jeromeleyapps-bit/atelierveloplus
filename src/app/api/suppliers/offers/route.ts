import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getUserId } from "@/lib/api-helpers";
import { handleApiError } from "@/lib/api-error";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Removed getPrisma() - using direct import
  
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer produits fournisseur (SupplierProduct)
    const products = await prisma.supplierProduct.findMany({
      where: { userId },
      orderBy: [{ supplierName: 'asc' }, { name: 'asc' }],
      take: 1000, // Limite pour performance
    });

    // Transformer en format SupplierOffer pour compatibilité
    const offers = products.map(p => ({
      id: p.id,
      name: p.name,
      supplierName: p.supplierName,
      priceHT: p.priceHT,
      reference: p.reference,
      category: p.category,
      stock: p.stock,
      available: p.available,
    }));

    return NextResponse.json({ items: offers }, { status: 200 });
  } catch (error) {
    logger.error('[SUPPLIERS/OFFERS] Erreur:', error);
    return handleApiError(error, 'suppliers/offers/GET');
  }
}

export async function DELETE(req: Request) {
  // Removed getPrisma() - using direct import
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId') || undefined;

    const where: Prisma.SupplierOfferWhereInput = {};
    if (supplierId) where.supplierId = supplierId;

    const result = await prisma.supplierOffer.deleteMany({ where });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, 'suppliers/offers/DELETE');
  }
}
