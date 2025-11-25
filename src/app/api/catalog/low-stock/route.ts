import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Removed getPrisma() - using direct import

  try {
    // Fetch minimal fields pour MON STOCK uniquement (pas catalogue fournisseur)
    const items = await prisma.catalogItem.findMany({
      select: { id: true, name: true, stockQty: true, minStock: true, active: true },
      where: { 
        active: true,
        supplierName: null, // UNIQUEMENT MON STOCK (pas items P2R/fournisseurs)
      },
    });

    const list = (items || [])
      .map((i) => ({
        id: i.id,
        name: i.name,
        stockQty: Number(i.stockQty ?? 0),
        minStock: typeof i.minStock === "number" ? i.minStock : 0,
      }))
      .filter((i) => Number.isFinite(i.stockQty) && i.stockQty <= (i.minStock ?? 0))
      .sort((a, b) => (a.stockQty - (a.minStock ?? 0)) - (b.stockQty - (b.minStock ?? 0)))
      .slice(0, 20);

    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "low_stock_failed", detail: message }, { status: 500 });
  }
}
