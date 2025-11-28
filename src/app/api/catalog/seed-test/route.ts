import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

type SupplierOfferAvailability = 'IN_STOCK' | 'ON_ORDER' | 'OUT_OF_STOCK';

export const dynamic = "force-dynamic";

/**
 * Créer des données de test propres
 * 
 * - 10 pièces dans Mon Stock (CatalogItem)
 * - 5 offres fournisseurs (SupplierOffer)
 */
export async function POST(_req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    // 1. Créer un fournisseur
    const shimano = await prisma.supplier.upsert({
      where: { id: "shimano-123" },
      update: {},
      create: {
        id: "shimano-123",
        name: "Shimano",
        website: "https://bike.shimano.com",
        connectorType: "MOCK",
        active: true
      }
    });

    const sram = await prisma.supplier.upsert({
      where: { id: "sram-456" },
      update: {},
      create: {
        id: "sram-456",
        name: "SRAM",
        website: "https://www.sram.com",
        connectorType: "MOCK",
        active: true
      }
    });

    // 2. Créer des pièces dans Mon Stock
    const stockItems = [
      { name: "Pneu VTT 26\" Michelin", category: 'PARTS', priceHT: 15, priceTTC: 18, vatRate: 20, stockQty: 10, minStock: 5, active: true },
      { name: "Chambre à air 26\"", category: 'PARTS', priceHT: 5, priceTTC: 6, vatRate: 20, stockQty: 20, minStock: 10, active: true },
      { name: "Chaîne 11v Shimano", category: 'PARTS', priceHT: 25, priceTTC: 30, vatRate: 20, stockQty: 8, minStock: 5, active: true },
      { name: "Cassette 10v 11-36", category: 'PARTS', priceHT: 35, priceTTC: 42, vatRate: 20, stockQty: 5, minStock: 3, active: true },
      { name: "Plaquettes frein Shimano", category: 'PARTS', priceHT: 12, priceTTC: 14.4, vatRate: 20, stockQty: 15, minStock: 8, active: true },
      { name: "Câble frein", category: 'PARTS', priceHT: 3, priceTTC: 3.6, vatRate: 20, stockQty: 25, minStock: 10, active: true },
      { name: "Gaine frein", category: 'PARTS', priceHT: 2, priceTTC: 2.4, vatRate: 20, stockQty: 30, minStock: 15, active: true },
      { name: "Casque VTT", category: 'EQUIPMENT', priceHT: 40, priceTTC: 48, vatRate: 20, stockQty: 3, minStock: 2, active: true },
      { name: "Gants VTT", category: 'EQUIPMENT', priceHT: 15, priceTTC: 18, vatRate: 20, stockQty: 6, minStock: 3, active: true },
      { name: "Bidon 750ml", category: 'ACCESSORIES', priceHT: 5, priceTTC: 6, vatRate: 20, stockQty: 12, minStock: 5, active: true },
    ];

    for (const item of stockItems) {
      await prisma.catalogItem.create({
        data: {
          ...item,
          active: true,
        }
      });
    }

    // 3. Créer des offres fournisseurs avec des types stricts
    const supplierOffers = [
      { 
        Supplier: { connect: { id: shimano.id } },
        sku: "SH-TIRE-001", 
        name: "Pneu VTT 29\" Shimano Pro", 
        price: 22, 
        priceHT: 22,
        availability: 'IN_STOCK' as SupplierOfferAvailability,
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an plus tard
      },
      { 
        Supplier: { connect: { id: shimano.id } },
        sku: "SH-CHAIN-002", 
        name: "Chaîne 12v Shimano XT", 
        price: 35,
        priceHT: 35, 
        availability: 'IN_STOCK' as SupplierOfferAvailability,
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an plus tard
      },
      { 
        Supplier: { connect: { id: shimano.id } },
        sku: "SH-BRAKE-003", 
        name: "Plaquettes frein Shimano XT", 
        price: 18,
        priceHT: 18, 
        availability: 'ON_ORDER' as SupplierOfferAvailability,
        active: true,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 mois plus tard
      },
      { 
        Supplier: { connect: { id: sram.id } },
        sku: "SR-CHAIN-001", 
        name: "Chaîne 12v SRAM Eagle", 
        price: 45,
        priceHT: 45, 
        availability: 'IN_STOCK' as SupplierOfferAvailability,
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an plus tard
      },
      { 
        Supplier: { connect: { id: sram.id } },
        sku: "SR-CASS-002", 
        name: "Cassette 12v SRAM Eagle 10-52", 
        price: 120,
        priceHT: 120, 
        availability: 'OUT_OF_STOCK' as SupplierOfferAvailability,
        active: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an plus tard
      },
    ];

    for (const offer of supplierOffers) {
      await prisma.supplierOffer.create({
        data: offer
      });
    }

    return NextResponse.json({
      success: true,
      created: {
        suppliers: 2,
        catalogItems: stockItems.length,
        supplierOffers: supplierOffers.length,
      },
      message: "Données de test créées avec succès"
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création des données de test';
    logger.error("[SEED-TEST] Erreur", { error: message });
    return NextResponse.json({
      error: "seed_failed",
      message
    }, { status: 500 });
  }
}