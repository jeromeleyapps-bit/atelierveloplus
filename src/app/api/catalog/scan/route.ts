import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
import { logger } from '@/lib/logger';
  convertScannedItem, 
  validateUnifiedItem,
  generateSKU,
  type ScannedItem 
} from "@/lib/catalog-harmonizer";

export const dynamic = "force-dynamic";

/**
 * Scanner Code-Barres
 * 
 * POST /api/catalog/scan
 * Body: { ean: "3700123456789", quantity?: 1 }
 * 
 * Si l'item existe : incrémente le stock
 * Si n'existe pas : crée avec stock = quantity
 */
export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const body = await req.json();
    const { ean, quantity = 1 } = body;

    if (!ean) {
      return NextResponse.json({ error: "ean_required" }, { status: 400 });
    }

    // Valider format EAN
    if (!/^\d{8,13}$/.test(ean)) {
      return NextResponse.json({ 
        error: "invalid_ean",
        message: "Le code EAN doit contenir 8 à 13 chiffres"
      }, { status: 400 });
    }

    logger.info(`[SCAN] EAN: ${ean}, Quantité: ${quantity}`);

    // Chercher si existe
    const existing = await prisma.catalogItem.findFirst({
      where: { ean }
    });

    if (existing) {
      // Incrémenter le stock
      const updated = await prisma.catalogItem.update({
        where: { id: existing.id },
        data: {
          stockQty: { increment: quantity }
        }
      });

      logger.info(`[SCAN] Stock incrémenté : ${existing.stockQty} → ${updated.stockQty}`);

      return NextResponse.json({
        success: true,
        action: "stock_incremented",
        item: updated,
        message: `Stock de "${updated.name}" mis à jour : ${updated.stockQty} unités`
      });
    }

    // Item n'existe pas : essayer de récupérer les infos via EAN lookup
    const productName = `Produit EAN ${ean}`;
    
    // TODO: Implémenter lookup EAN via API externe
    // const productInfo = await lookupEAN(ean);
    // if (productInfo) productName = productInfo.name;

    // Créer l'item
    const scanned: ScannedItem = {
      ean,
      name: productName,
      quantity,
      timestamp: new Date(),
    };

    const unified = convertScannedItem(scanned);

    // Valider
    const validation = validateUnifiedItem(unified);
    if (!validation.valid) {
      return NextResponse.json({
        error: "validation_failed",
        errors: validation.errors
      }, { status: 400 });
    }

    // Générer SKU
    const sku = generateSKU(unified.category, unified.name);

    // Créer
    const created = await prisma.catalogItem.create({
      data: {
        sku,
        ean: unified.ean,
        name: unified.name,
        category: unified.category,
        priceHT: unified.priceHT,
        priceTTC: unified.priceTTC,
        vatRate: unified.vatRate,
        stockQty: unified.stockQty,
        minStock: unified.minStock,
        active: unified.active,
      }
    });

    logger.info(`[SCAN] Nouvel item créé : ${created.name} (${created.sku})`);

    return NextResponse.json({
      success: true,
      action: "item_created",
      item: created,
      message: `Nouveau produit créé : "${created.name}" (${created.stockQty} unités)`,
      warning: "Prix non défini - À compléter manuellement"
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du scan';
    logger.error("[SCAN] Erreur:", message);
    return NextResponse.json({
      error: "scan_failed",
      message
    }, { status: 500 });
  }
}

/**
 * Lookup EAN via API externe (à implémenter)
 */
async function _lookupEAN(_ean: string): Promise<{ name: string; brand?: string } | null> {
  // TODO: Implémenter avec une API comme:
  // - Open Food Facts
  // - UPC Database
  // - Barcode Lookup
  
  try {
    // Exemple avec Open Food Facts
    // const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
    // const data = await response.json();
    // if (data.status === 1) {
    //   return {
    //     name: data.product.product_name,
    //     brand: data.product.brands
    //   };
    // }
    
    return null;
  } catch (e) {
    logger.error("[LOOKUP EAN] Erreur:", e);
    return null;
  }
}
