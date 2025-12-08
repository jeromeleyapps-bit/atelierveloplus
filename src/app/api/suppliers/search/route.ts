import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MockConnector } from "@/lib/suppliers/mock";
import { P2RConnector } from "@/lib/suppliers/p2r";
import type { SearchOptions, SupplierConnector } from "@/lib/suppliers/base";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limitParam = searchParams.get("limit");
  const limit = Math.min(200, Math.max(1, Number(limitParam || 50)));

  if (!q) return NextResponse.json({ offers: [] }, { status: 200 });
  const qClean = q.replace(/\D+/g, "");

  // Removed getPrisma() - using direct import

  try {
    const orConds: Prisma.SupplierItemWhereInput[] = [
      { supplierSku: { contains: q } },
      { ean: { contains: q } },
      // Allow searching by linked catalog item name when available
      { CatalogItem: { name: { contains: q } } },
    ];
    if (qClean && qClean.length >= 8) {
      orConds.push({ ean: { contains: qClean } });
    }
    const items = await prisma.supplierItem.findMany({
      where: { OR: orConds },
      take: limit,
      orderBy: [
        { lastPriceHT: 'asc' as const },
        { supplierId: 'asc' as const },
        { supplierSku: 'asc' as const },
      ],
      include: { Supplier: true, CatalogItem: true },
    });

    const offers = (items || []).map((it: { supplierId: string; Supplier?: { name: string } | null; supplierSku: string; ean?: string | null; lastPriceHT?: number | null; lastAvailability?: string | null; lastCheckedAt?: Date | null }) => ({
      supplierId: it.supplierId,
      supplierName: it.Supplier?.name || "",
      supplierSku: it.supplierSku,
      ean: it.ean || null,
      lastPriceHT: it.lastPriceHT ?? null,
      lastAvailability: it.lastAvailability ?? null,
      lastCheckedAt: it.lastCheckedAt ? new Date(it.lastCheckedAt).toISOString() : null,
    }));

    return NextResponse.json({ offers }, { status: 200 });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "supplier_search_failed", detail }, { status: 500 });
  }
}

/**
 * POST /api/suppliers/search
 * B2B Live Search - Search products across all active suppliers
 */
export async function POST(req: Request) {
  // Removed getPrisma() - using direct import

  try {
    const body = await req.json();
    const { query, limit = 20, inStockOnly = false } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "query_too_short", message: "Query must be at least 2 characters" }, { status: 400 });
    }

    // Get active suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { active: true },
      include: { SupplierCredential: true }
    });

    if (suppliers.length === 0) {
      return NextResponse.json({ results: [], message: "No active suppliers configured" }, { status: 200 });
    }

    // Search options
    const searchOptions: SearchOptions = {
      query: query.trim(),
      limit,
      inStockOnly
    };

    // Search all suppliers in parallel
    const searchPromises = suppliers.map(async (supplier) => {
      try {
        // Select connector based on supplier type
        let connector: SupplierConnector;
        
        switch (supplier.connectorType) {
          case 'P2R':
            connector = new P2RConnector();
            break;
          case 'MOCK':
          default:
            connector = new MockConnector();
            break;
        }
        
        if (!connector.search) {
          return { supplierId: supplier.id, results: [] };
        }

        // Get credentials for this supplier
        const credentials = supplier.SupplierCredential && supplier.SupplierCredential.length > 0 
          ? {
              username: supplier.SupplierCredential[0].username || undefined,
              password: supplier.SupplierCredential[0].password || undefined,
              extra: supplier.SupplierCredential[0].extraJson ? JSON.parse(supplier.SupplierCredential[0].extraJson) : undefined
            }
          : undefined;

        const results = await connector.search(searchOptions, credentials);
        
        // Cache results in database (optional, skip if error)
        try {
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour cache
          
          for (const result of results) {
            try {
              await prisma.supplierOffer.create({
                data: {
                  supplierId: supplier.id,
                  externalId: result.externalId,
                  name: result.name,
                  description: result.description,
                  reference: result.reference,
                  brand: result.brand,
                  price: result.price,
                  priceHT: result.priceHT,
                  currency: result.currency,
                  availability: result.availability,
                  stock: result.stock,
                  deliveryDays: result.deliveryDays,
                  url: result.url,
                  imageUrl: result.imageUrl,
                  metadata: result.metadata ? JSON.stringify(result.metadata) : null,
                  expiresAt
                }
              });
            } catch (_cacheError) {
              // Ignore cache errors (duplicates, etc.)
            }
          }
        } catch (cacheError) {
          logger.error('Cache error:', cacheError);
        }

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          results: results.map(r => ({
            ...r,
            supplierId: supplier.id,
            supplierName: supplier.name
          }))
        };
      } catch (error) {
        logger.error(`Error searching supplier ${supplier.name}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          results: [],
          error: message
        };
      }
    });

    const supplierResults = await Promise.all(searchPromises);

    // Flatten and sort results by price
    const allResults = supplierResults
      .flatMap(sr => sr.results || [])
      .sort((a, b) => (a.price || 0) - (b.price || 0));

    return NextResponse.json({
      results: allResults,
      suppliers: supplierResults.map(sr => ({
        id: sr.supplierId,
        name: sr.supplierName,
        count: sr.results?.length || 0,
        error: sr.error
      })),
      total: allResults.length
    }, { status: 200 });

  } catch (error) {
    logger.error('B2B search error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: "search_failed", 
      detail 
    }, { status: 500 });
  }
}
