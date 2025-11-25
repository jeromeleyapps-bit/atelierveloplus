import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

/**
 * GET /api/service-rates
 * Récupère les prestations (lecture seule pour factures)
 * Accessible à tous les utilisateurs authentifiés
 */
export async function GET(request: NextRequest) {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

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

export const dynamic = "force-dynamic";
