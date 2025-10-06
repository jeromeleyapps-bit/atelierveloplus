import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    // Fetch minimal fields; assume minStock may be null/undefined in schema
    const items = await prisma.catalogItem.findMany({
      select: { id: true, name: true, stockQty: true, minStock: true, active: true },
      where: { active: true },
    });

    const list = (items || [])
      .map((i) => ({
        id: i.id,
        name: i.name,
        stockQty: Number(i.stockQty ?? 0),
        minStock: typeof (i as any).minStock === "number" ? (i as any).minStock : 0,
      }))
      .filter((i) => Number.isFinite(i.stockQty) && i.stockQty <= (i.minStock ?? 0))
      .sort((a, b) => (a.stockQty - (a.minStock ?? 0)) - (b.stockQty - (b.minStock ?? 0)))
      .slice(0, 20);

    return NextResponse.json(list, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: "low_stock_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}
