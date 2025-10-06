import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { FALLBACK } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
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
  } catch (e: any) {
    return NextResponse.json({ error: "seed_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}
