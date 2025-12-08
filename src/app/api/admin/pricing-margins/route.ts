import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

interface PricingMarginInput {
  minPrice: number;
  maxPrice?: number | null;
  coefficient: number;
}

// GET - Liste des marges
export async function GET() {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const margins = await prisma.pricingMargin.findMany({
      orderBy: { minPrice: 'asc' },
    });

    return NextResponse.json(margins);
  } catch (error) {
    logger.error("Error fetching pricing margins:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch margins";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle marge
export async function POST(req: NextRequest) {
  // Removed getPrisma() - using direct import
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
  } catch (error) {
    logger.error("Error creating pricing margin:", error);
    const message = error instanceof Error ? error.message : "Failed to create margin";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour toutes les marges
export async function PUT(req: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { margins } = await req.json();

    // Supprimer toutes les marges existantes
    await prisma.pricingMargin.deleteMany({});

    // Créer les nouvelles marges
    const created = await prisma.pricingMargin.createMany({
      data: margins.map((m: PricingMarginInput) => ({
        minPrice: Number(m.minPrice),
        maxPrice: m.maxPrice ? Number(m.maxPrice) : null,
        coefficient: Number(m.coefficient),
      })),
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error) {
    logger.error("Error updating pricing margins:", error);
    const message = error instanceof Error ? error.message : "Failed to update margins";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
