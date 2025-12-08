import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * Migration des pièces fournisseurs de CatalogItem vers SupplierOffer
 * 
 * Les pièces avec SKU dans le champ name sont des imports fournisseurs
 * qui doivent être dans SupplierOffer, pas CatalogItem
 */
export async function POST(_req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    // 1. Trouver les pièces corrompues (SKU dans name)
    const corruptedItems = await prisma.catalogItem.findMany({
      where: {
        OR: [
          { name: { contains: 'E+' } },
          { name: { contains: '+' } },
          // Note: regex non supporté par Prisma, filtrage manuel si nécessaire
        ]
      }
    });

    logger.info(`[MIGRATE] Trouvé ${corruptedItems.length} pièces à migrer`);

    // 2. Créer SupplierOffer pour chaque pièce
    let migrated = 0;
    let errors = 0;

    for (const item of corruptedItems) {
      try {
        // Créer l'offre fournisseur
        // NOTE: Cette route nécessite un fournisseur existant - à créer manuellement d'abord
        const defaultSupplier = await prisma.supplier.findFirst({ where: { active: true } });
        if (!defaultSupplier) {
          throw new Error("Aucun fournisseur actif trouvé. Créez un fournisseur d'abord.");
        }
        
        await prisma.supplierOffer.create({
          data: {
            supplierId: defaultSupplier.id,
            reference: item.name,
            name: item.name,
            price: item.priceTTC || item.priceHT || 0,
            priceHT: item.priceHT || 0,
            availability: "En stock",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
          }
        });

        // Supprimer de CatalogItem
        await prisma.catalogItem.delete({
          where: { id: item.id }
        });

        migrated++;
      } catch (err) {
        logger.error(`[MIGRATE] Erreur pour ${item.name}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      errors,
      message: `${migrated} pièces migrées vers SupplierOffer, ${errors} erreurs`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la migration';
    logger.error("[MIGRATE] Erreur", { error: message });
    return NextResponse.json({
      error: "migration_failed",
      message
    }, { status: 500 });
  }
}
