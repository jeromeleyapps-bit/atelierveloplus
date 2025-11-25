import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/jwt";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/catalog/stats
 * Statistiques agrégées pour landing catalogue (3 tuiles)
 * - Pièces & Accessoires
 * - Vélos en Vente
 * - Prestations & Services
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    let userId = user?.userId;
    
    // Fallback: premier utilisateur actif
    if (!userId || userId === 'electron-local') {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      userId = firstUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    }

    // === STATS PIÈCES & ACCESSOIRES ===
    // Note: CatalogItem n'a pas userId dans schema, on récupère tous
    const catalogItems = await prisma.catalogItem.findMany({
      select: {
        supplierName: true,
        priceHT: true,
        stockQty: true,
        minStock: true,
      },
    });

    const myStock = catalogItems.filter(item => !item.supplierName);
    const supplierCatalog = catalogItems.filter(item => item.supplierName);
    
    const piecesCount = myStock.length;
    const piecesValueHT = myStock.reduce((sum, item) => sum + (item.priceHT * item.stockQty), 0);
    const piecesLowStock = myStock.filter(item => item.stockQty < item.minStock).length;

    // Offres B2B (SupplierOffer)
    // Note: SupplierOffer n'a pas userId dans schema, on récupère tous
    const b2bOffers = await prisma.supplierOffer.findMany({
      select: { id: true },
    });
    const b2bOffersCount = b2bOffers.length;

    // === STATS VÉLOS ===
    const bikes = await prisma.bike.findMany({
      where: { userId, active: true },
      select: {
        condition: true,
        isElectric: true,
        sellingPriceHT: true,
        stock: true,
      },
    });

    const bikesCount = bikes.length;
    const bikesNew = bikes.filter(b => b.condition === 'NEW').length;
    const bikesUsed = bikes.filter(b => b.condition !== 'NEW').length;
    const bikesElectric = bikes.filter(b => b.isElectric).length;
    const bikesValueHT = bikes.reduce((sum, b) => sum + (b.sellingPriceHT * b.stock), 0);
    const bikesInStock = bikes.filter(b => b.stock > 0).length;

    // === STATS SERVICES & PRESTATIONS ===
    const services = await prisma.serviceRate.findMany({
      where: { active: true },
      select: {
        id: true,
        category: true,
        updatedAt: true,
      },
    });

    const servicesCount = services.length;
    const servicesActive = services.length; // Tous actifs (filtrés)
    
    // Catégories uniques
    const categoriesSet = new Set<string>();
    services.forEach(s => {
      if (s.category) categoriesSet.add(s.category);
    });
    const servicesCategories = categoriesSet.size;

    // Dernière mise à jour
    let servicesLastUpdate: string | null = null;
    if (services.length > 0) {
      const sortedByDate = services.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      servicesLastUpdate = sortedByDate[0].updatedAt.toISOString();
    }

    // === RÉPONSE ===
    return NextResponse.json({
      // Pièces
      piecesCount,
      piecesValueHT: Math.round(piecesValueHT * 100) / 100,
      piecesSupplierCount: supplierCatalog.length,
      piecesLowStock,
      b2bOffersCount,
      
      // Vélos
      bikesCount,
      bikesNew,
      bikesUsed,
      bikesElectric,
      bikesValueHT: Math.round(bikesValueHT * 100) / 100,
      bikesInStock,
      
      // Services
      servicesCount,
      servicesActive,
      servicesCategories,
      servicesLastUpdate,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'stats_failed';
    logger.error('[GET /api/catalog/stats] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
