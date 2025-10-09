import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { handleApiError, validateRequired, validateTypes } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = (searchParams.get("category") || undefined) as string | undefined; // expects Prisma enum values: PIECES | EQUIPEMENTS | AUTRES
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const limit = Math.min(200, Math.max(1, Number(limitParam || 50)));
  const skip = Math.max(0, Number(offsetParam || 0));

  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  // Normalize legacy category values (lowercase or accented) to enum values
  try {
    const exec = (prisma as any).$executeRawUnsafe?.bind(prisma);
    if (exec) {
      await exec("UPDATE CatalogItem SET category='PIECES' WHERE LOWER(category) IN ('piece','pièce','pièces');");
      await exec("UPDATE CatalogItem SET category='EQUIPEMENTS' WHERE LOWER(category) IN ('equipement','équipement','equipements','équipements');");
      await exec("UPDATE CatalogItem SET category='AUTRES' WHERE LOWER(category) IN ('autre','autres');");
    }
  } catch {}

  const where: any = {};
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Default sort A -> Z by name
  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({ where, take: limit, skip, orderBy: [{ name: "asc" }, { sku: "asc" }] as any }),
    prisma.catalogItem.count({ where }),
  ]);
  return NextResponse.json({ items, total }, { status: 200 });
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    const body = await req.json();
    const { sku, category, name, priceHT, priceTTC, vatRate, active = true } = body || {};
    
    validateRequired(body, ['category', 'name']);
    validateTypes(body, { priceHT: 'number', priceTTC: 'number', vatRate: 'number' });
    
    const created = await prisma.catalogItem.create({
      data: { sku: sku || null, category, name, priceHT, priceTTC, vatRate, active: !!active },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'catalog/items/POST');
  }
}
