import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { handleApiError } from "@/lib/api-error";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = (searchParams.get("category") || undefined) as string | undefined; // expects Prisma enum values: PIECES | EQUIPEMENTS | AUTRES
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = Math.min(50000, Math.max(1, Number(limitParam || 50))); // Support catalogues volumineux (P2R 17k)
  const skip = Math.max(0, Number(offsetParam || 0));

  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  // Normalize legacy category values (lowercase or accented) to enum values
  try {
    await prisma.$executeRawUnsafe("UPDATE CatalogItem SET category='PIECES' WHERE LOWER(category) IN ('piece','pièce','pièces');");
    await prisma.$executeRawUnsafe("UPDATE CatalogItem SET category='EQUIPEMENTS' WHERE LOWER(category) IN ('equipement','équipement','equipements','équipements');");
    await prisma.$executeRawUnsafe("UPDATE CatalogItem SET category='AUTRES' WHERE LOWER(category) IN ('autre','autres');");
  } catch (err) {
    logger.error("[CATALOG API] Category normalization error:", err);
    // Continue anyway, this is not critical
  }

  const where: Prisma.CatalogItemWhereInput = {};
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { sku: { contains: q } },
      { id: { contains: q } },
    ];
  }

  // Default sort A -> Z by name
  try {
    const [items, total] = await Promise.all([
      prisma.catalogItem.findMany({ where, take: limit, skip, orderBy: [{ name: "asc" }, { sku: "asc" }] as unknown }),
      prisma.catalogItem.count({ where }),
    ]);
    return NextResponse.json({ items, total }, { status: 200 });
  } catch (error) {
    logger.error("[CATALOG API] Query error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch catalog items";
    return NextResponse.json({ 
      error: "database_error", 
      message,
      items: [],
      total: 0
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import

  try {
    const body = await req.json();
    
    // Importer l'harmonizer
    const { convertManualInput, validateUnifiedItem, generateSKU } = await import("@/lib/catalog-harmonizer");
    
    // Convertir en format unifié
    const unified = convertManualInput({
      name: body.name,
      sku: body.sku,
      priceHT: body.priceHT,
      priceTTC: body.priceTTC,
      vatRate: body.vatRate,
      stockQty: body.stockQty,
      minStock: body.minStock,
      category: body.category,
      ean: body.ean,
    });
    
    // Valider
    const validation = validateUnifiedItem(unified);
    if (!validation.valid) {
      return NextResponse.json({
        error: "validation_failed",
        errors: validation.errors
      }, { status: 400 });
    }
    
    // Générer SKU si absent
    const sku = unified.sku || generateSKU(unified.category, unified.name);
    
    // Créer
    const created = await prisma.catalogItem.create({
      data: {
        sku,
        ean: unified.ean,
        category: unified.category,
        name: unified.name,
        priceHT: unified.priceHT,
        priceTTC: unified.priceTTC,
        vatRate: unified.vatRate,
        stockQty: unified.stockQty,
        minStock: unified.minStock,
        active: unified.active,
      },
    });
    
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'catalog/items/POST');
  }
}

export async function DELETE(req: Request) {
  // Removed getPrisma() - using direct import

  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope'); // 'stock' | 'supplier' | null
    const force = searchParams.get('force') === 'true'; // Force delete même si référencé

    const where: Prisma.CatalogItemWhereInput = {};
    if (scope === 'stock') where.supplierName = null;
    if (scope === 'supplier') where.supplierName = { not: null };

    const candidates = await prisma.catalogItem.findMany({ select: { id: true }, where });
    if (candidates.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

    const ids = candidates.map(c => c.id);
    
    let deletableIds = ids;
    
    // Si pas force, vérifier références
    if (!force) {
      const [invRefs, movRefs] = await Promise.all([
        prisma.invoiceLine.findMany({ where: { partId: { in: ids } }, select: { partId: true } }),
        prisma.stockMovement.findMany({ where: { itemId: { in: ids } }, select: { itemId: true } }),
      ]);
      const refSet = new Set<string>([
        ...invRefs.map(r => r.partId!).filter(Boolean),
        ...movRefs.map(r => r.itemId),
      ]);
      deletableIds = ids.filter(id => !refSet.has(id));

      if (deletableIds.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, skipped: ids.length, reason: 'referenced' });
      }
    }

    const result = await prisma.$transaction([
      prisma.supplierItem.deleteMany({ where: { catalogItemId: { in: deletableIds } } }),
      prisma.supplierOffer.deleteMany({ where: { catalogItemId: { in: deletableIds } } }),
      prisma.catalogItem.deleteMany({ where: { id: { in: deletableIds } } }),
    ]);

    const deletedCount = result[2].count ?? deletableIds.length;
    const skipped = ids.length - deletedCount;
    return NextResponse.json({ ok: true, deleted: deletedCount, skipped });
  } catch (error) {
    return handleApiError(error, 'catalog/items/DELETE');
  }
}
