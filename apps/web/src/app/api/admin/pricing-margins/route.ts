import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Liste des marges
export async function GET() {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const margins = await prisma.pricingMargin.findMany({
      orderBy: { minPrice: 'asc' },
    });

    return NextResponse.json(margins);
  } catch (error: any) {
    console.error("Error fetching pricing margins:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch margins" },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle marge
export async function POST(req: NextRequest) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { minPrice, maxPrice, coefficient } = await req.json();

    const margin = await prisma.pricingMargin.create({
      data: {
        minPrice: Number(minPrice),
        maxPrice: maxPrice ? Number(maxPrice) : null,
        coefficient: Number(coefficient),
      },
    });

    return NextResponse.json(margin, { status: 201 });
  } catch (error: any) {
    console.error("Error creating pricing margin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create margin" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour toutes les marges
export async function PUT(req: NextRequest) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { margins } = await req.json();

    // Supprimer toutes les marges existantes
    await prisma.pricingMargin.deleteMany({});

    // Créer les nouvelles marges
    const created = await prisma.pricingMargin.createMany({
      data: margins.map((m: any) => ({
        minPrice: Number(m.minPrice),
        maxPrice: m.maxPrice ? Number(m.maxPrice) : null,
        coefficient: Number(m.coefficient),
      })),
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error: any) {
    console.error("Error updating pricing margins:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update margins" },
      { status: 500 }
    );
  }
}
