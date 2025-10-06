import { NextResponse } from "next/server";
import { searchCatalogLocal, type CatalogCategory } from "@/lib/catalog";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = (searchParams.get("category") || undefined) as CatalogCategory | undefined;
  const limitParam = searchParams.get("limit");
  const limit = Math.min(100, Math.max(1, Number(limitParam || 20)));

  try {
    // Try Prisma (SQLite) if available
    const prisma = await getPrisma();
    if (prisma) {
      const where: any = { active: true };
      if (category) where.category = category;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { id: { contains: q, mode: 'insensitive' } },
        ];
      }
      const rows = await prisma.catalogItem.findMany({ where, take: limit, orderBy: { updatedAt: 'desc' } });
      return NextResponse.json(rows, { status: 200 });
    }
    // Fallback local
    const fallback = searchCatalogLocal({ q, category, limit });
    return NextResponse.json(fallback, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "catalog_search_failed" }, { status: 500 });
  }
}
