import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// Type pour la réponse de l'API
type SearchResult = {
  myStock: {
    items: Array<{
      id: string;
      name: string;
      sku: string | null;
      ean: string | null;
      priceHT: number;
      priceTTC: number;
      vatRate: number;
      stockQty: number;
      minStock: number;
      active: boolean;
      category: string;
    }>;
    total: number;
  };
  supplierOffers: {
    items: Array<{
      id: string;
      supplierId: string;
      supplierName: string;
      supplierWebsite: string | null;
      sku: string | null;
      name: string;
      priceHT: number;
      price: number;
      availability: string;
      ean: string | null;
      lastCheckedAt: Date | null;
    }>;
    total: number;
  };
  query: string | null;
  totalResults: number;
};

/**
 * Recherche unifiée dans Mon Stock ET Catalogue Fournisseurs
 * 
 * Retourne un objet avec :
 * - myStock: items de CatalogItem
 * - supplierOffers: items de SupplierOffer
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    // Construction des conditions de recherche pour Mon Stock
    const stockWhere: Prisma.CatalogItemWhereInput = q ? {
      OR: [
        { name: { contains: q } },
        { sku: { contains: q } },
        { ean: { contains: q } }
      ]
    } : {};

    // Construction des conditions de recherche pour les offres fournisseurs
    const offersWhere: Prisma.SupplierOfferWhereInput = q ? {
      OR: [
        { name: { contains: q } },
        { reference: { contains: q } },
        { externalId: { contains: q } }
      ]
    } : {};

    // 1. D'abord, on récupère les offres fournisseurs
    const supplierOffers = await prisma.supplierOffer.findMany({
      where: offersWhere,
      take: 50,
      select: {
        id: true,
        name: true,
        reference: true,
        externalId: true,
        priceHT: true,
        price: true,
        availability: true,
        supplierId: true,
        catalogItemId: true,
        description: true,
        brand: true,
        currency: true,
        url: true,
        metadata: true,
        expiresAt: true
      }
    });

    // 2. On récupère les détails des fournisseurs pour les offres trouvées
    const supplierIds = Array.from(new Set(supplierOffers.map(o => o.supplierId)));
    const supplierDetails = supplierIds.length > 0 ? await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        name: true,
        website: true
      }
    }) : [];

    // 3. On récupère les articles du stock
    const myStock = await prisma.catalogItem.findMany({
      where: stockWhere,
      take: 50,
      select: {
        id: true,
        name: true,
        sku: true,
        ean: true,
        priceHT: true,
        priceTTC: true,
        vatRate: true,
        stockQty: true,
        minStock: true,
        active: true,
        category: true
      }
    });

    // Création d'un index des fournisseurs pour un accès rapide
    const suppliersMap = new Map(
      supplierDetails.map(supplier => [supplier.id, supplier])
    );

    // Construction de la réponse
    const result: SearchResult = {
      myStock: {
        items: myStock,
        total: myStock.length
      },
      supplierOffers: {
        items: supplierOffers.map(offer => {
          const supplier = suppliersMap.get(offer.supplierId);
          return {
            id: offer.id,
            supplierId: offer.supplierId,
            supplierName: supplier?.name || "Inconnu",
            supplierWebsite: supplier?.website || null,
            sku: offer.reference,
            name: offer.name,
            priceHT: offer.priceHT,
            price: offer.price || offer.priceHT,
            availability: offer.availability || 'UNKNOWN',
            ean: null,
            lastCheckedAt: null,
          };
        }),
        total: supplierOffers.length
      },
      query: q || null,
      totalResults: myStock.length + supplierOffers.length
    };

    return NextResponse.json(result);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la recherche';
    logger.error("[SEARCH-ALL] Erreur", { error: message });
    return NextResponse.json({
      error: "search_failed",
      message,
      myStock: { items: [], total: 0 },
      supplierOffers: { items: [], total: 0 }
    }, { status: 500 });
  }
}
