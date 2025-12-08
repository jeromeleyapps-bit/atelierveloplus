import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FALLBACK } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode || "fallback";
  try {
    if (mode === "fallback") {
      const count = await prisma.catalogItem.count();
      if (count === 0) {
        // Use createMany without skipDuplicates for wider Prisma compatibility
        await prisma.catalogItem.createMany({
          data: FALLBACK.map((i) => ({
            sku: i.id,
            category: i.category,
            name: i.name,
            priceHT: i.priceHT,
            priceTTC: i.priceTTC,
            vatRate: i.vatRate,
            active: true,
          })),
        });
      }
      return NextResponse.json({ ok: true, seeded: count === 0 ? FALLBACK.length : 0 });
    }
    return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "seed_failed", detail: message }, { status: 500 });
  }
}
