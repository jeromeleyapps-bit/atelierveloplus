import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

/**
 * POST /api/catalog/items/from-supplier
 * Ajoute un article fournisseur à MON STOCK
 * 
 * Body: { supplierOfferId: string }
 */
export async function POST(request: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json(
      { error: 'Database unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { supplierOfferId } = body;

    if (!supplierOfferId) {
      return NextResponse.json(
        { error: 'supplierOfferId required' },
        { status: 400 }
      );
    }

    // Récupérer l'offre fournisseur
    const supplierOffer = await prisma.supplierOffer.findUnique({
      where: { id: supplierOfferId },
      include: { Supplier: true }
    });

    if (!supplierOffer) {
      return NextResponse.json(
        { error: 'Supplier offer not found' },
        { status: 404 }
      );
    }

    // Vérifier si un CatalogItem existe déjà pour cette offre
    if (supplierOffer.catalogItemId) {
      return NextResponse.json(
        { error: 'Item already in stock', catalogItemId: supplierOffer.catalogItemId },
        { status: 409 }
      );
    }

    // Déterminer la catégorie
    let category: string = 'PIECES';
    if (supplierOffer.name?.toLowerCase().includes('équipement') || 
        supplierOffer.name?.toLowerCase().includes('accessoire')) {
      category = 'EQUIPEMENTS';
    }

    // Créer le CatalogItem
    const catalogItem = await prisma.catalogItem.create({
      data: {
        sku: supplierOffer.reference || undefined,
        supplierSku: supplierOffer.reference || undefined,
        category,
        name: supplierOffer.name,
        priceHT: supplierOffer.priceHT || supplierOffer.price,
        priceTTC: supplierOffer.price,
        vatRate: 20, // TVA par défaut
        active: true,
        stockQty: supplierOffer.stock || 0,
        minStock: 1,
        reorderQty: 1,
        purchasePriceHT: supplierOffer.priceHT || supplierOffer.price,
        purchasePriceTTC: supplierOffer.price,
        supplierVatEnabled: false,
        supplierName: supplierOffer.Supplier?.name || undefined,
        availability: supplierOffer.availability || undefined,
      }
    });

    // Lier l'offre fournisseur au CatalogItem
    await prisma.supplierOffer.update({
      where: { id: supplierOfferId },
      data: { catalogItemId: catalogItem.id }
    });

    return NextResponse.json({
      success: true,
      catalogItem,
      message: 'Article ajouté à MON STOCK'
    });

  } catch (error) {
    logger.error('[API] Error adding supplier offer to stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}