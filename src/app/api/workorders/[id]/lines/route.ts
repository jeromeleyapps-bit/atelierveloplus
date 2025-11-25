import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workorders/[id]/lines
 * Récupère toutes les lignes d'un ticket
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { id } = await context.params;

    let lines = await prisma.workOrderLine.findMany({
      where: { workOrderId: id },
      orderBy: { createdAt: "asc" },
    });

    // Récupérer le statut auto-entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();

    // Forcer TVA à 0 si auto-entrepreneur
    if (isAutoEntrepreneur) {
      lines = lines.map((line: any) => ({
        ...line,
        vatRate: 0,
      }));
    }

    return NextResponse.json({ lines });
  } catch (error) {
    logger.error("[API] Error fetching work order lines:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des lignes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/workorders/[id]/lines
 * Ajoute une ligne à un ticket
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Récupérer le statut auto-entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();

    // Parser les nombres correctement
    const quantity = body.quantity != null ? parseFloat(body.quantity) : 1;
    const priceHT = body.priceHT != null ? parseFloat(body.priceHT) : 0;
    const vatRate = body.vatRate != null ? parseFloat(body.vatRate) : 0;
    
    logger.info('[API /lines POST] Données reçues:', {
      type: body.type,
      description: body.description,
      quantity: body.quantity,
      priceHT: body.priceHT,
      vatRate: body.vatRate,
    });
    
    logger.info('[API /lines POST] Données parsées:', {
      quantity,
      priceHT,
      vatRate: isAutoEntrepreneur ? 0 : vatRate,
      total: quantity * priceHT,
    });
    
    const line = await prisma.workOrderLine.create({
      data: {
        workOrderId: id,
        type: body.type, // 'service' | 'part' | 'manual'
        description: body.description,
        quantity: quantity,
        priceHT: priceHT,
        vatRate: isAutoEntrepreneur ? 0 : vatRate,
        duration: body.duration ? parseInt(body.duration) : null,
        sourceId: body.sourceId || null,
        notes: body.notes || null,
      },
    });
    
    logger.info('[API /lines POST] Ligne créée:', {
      id: line.id,
      quantity: line.quantity,
      priceHT: line.priceHT,
      total: line.quantity * line.priceHT,
    });

    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    logger.error("[API] Error creating work order line:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la ligne" },
      { status: 500 },
    );
  }
}
