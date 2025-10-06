import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { MockConnector } from "@/lib/suppliers/mock";
import { P2RConnector } from "@/lib/suppliers/p2r";
import type { SearchOptions, SupplierConnector } from "@/lib/suppliers/base";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limitParam = searchParams.get("limit");
  const limit = Math.min(200, Math.max(1, Number(limitParam || 50)));

  if (!q) return NextResponse.json({ offers: [] }, { status: 200 });
  const qClean = q.replace(/\D+/g, "");

  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    const orConds: any[] = [
      { supplierSku: { contains: q, mode: 'insensitive' } },
      { ean: { contains: q, mode: 'insensitive' } },
      // Allow searching by linked catalog item name when available
      { catalogItem: { name: { contains: q, mode: 'insensitive' } } },
    ];
    if (qClean && qClean.length >= 8) {
      orConds.push({ ean: { contains: qClean, mode: 'insensitive' } });
    }
    const items = await prisma.supplierItem.findMany({
      where: { OR: orConds },
      take: limit,
      orderBy: [
        { lastPriceHT: 'asc' as const },
        { supplierId: 'asc' as const },
        { supplierSku: 'asc' as const },
      ],
      include: { supplier: true, catalogItem: true },
    } as any);

    const offers = (items || []).map((it: any) => ({
      supplierId: it.supplierId,
      supplierName: it.supplier?.name || "",
      supplierSku: it.supplierSku,
      ean: it.ean || null,
      lastPriceHT: it.lastPriceHT ?? null,
      lastAvailability: it.lastAvailability ?? null,
      lastCheckedAt: it.lastCheckedAt ? new Date(it.lastCheckedAt).toISOString() : null,
    }));

    return NextResponse.json({ offers }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: "supplier_search_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * POST /api/suppliers/search
 * B2B Live Search - Search products across all active suppliers
 */
export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    const body = await req.json();
    const { query, limit = 20, inStockOnly = false } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "query_too_short", message: "Query must be at least 2 characters" }, { status: 400 });
    }

    // Get active suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { active: true },
      include: { credentials: true }
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
        const credentials = supplier.credentials && supplier.credentials.length > 0 
          ? {
              username: supplier.credentials[0].username || undefined,
              password: supplier.credentials[0].password || undefined,
              extra: supplier.credentials[0].extraJson ? JSON.parse(supplier.credentials[0].extraJson) : undefined
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
            } catch (cacheError) {
              // Ignore cache errors (duplicates, etc.)
            }
          }
        } catch (cacheError) {
          console.error('Cache error:', cacheError);
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
      } catch (error: any) {
        console.error(`Error searching supplier ${supplier.name}:`, error);
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          results: [],
          error: error.message
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

  } catch (error: any) {
    console.error('B2B search error:', error);
    return NextResponse.json({ 
      error: "search_failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
