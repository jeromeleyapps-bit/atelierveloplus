import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/service-rates
 * Récupère toutes les prestations
 */
export async function GET(request: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const bikeType = searchParams.get("bikeType");
    const category = searchParams.get("category");

    const where: Prisma.ServiceRateWhereInput = {};
    if (activeOnly) where.active = true;
    if (bikeType) where.bikeType = bikeType;
    if (category) where.category = category;

    const serviceRates = await prisma.serviceRate.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Récupérer la date de dernière mise à jour
    const lastUpdate = await prisma.serviceRate.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      serviceRates,
      lastUpdate: lastUpdate?.updatedAt || null,
    });
  } catch (error) {
    logger.error("[API] Error fetching service rates:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des prestations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/service-rates
 * Crée une nouvelle prestation
 */
export async function POST(request: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const body = await request.json();

    const serviceRate = await prisma.serviceRate.create({
      data: {
        name: body.name,
        description: body.description || null,
        priceHT: parseFloat(body.priceHT),
        bikeType: body.bikeType || null,
        category: body.category || null,
        duration: body.duration ? parseInt(body.duration) : null,
        active: body.active !== false,
      },
    });

    return NextResponse.json(serviceRate, { status: 201 });
  } catch (error) {
    logger.error("[API] Error creating service rate:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la prestation" },
      { status: 500 },
    );
  }
}
