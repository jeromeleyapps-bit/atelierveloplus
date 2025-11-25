import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string; lineId: string }>;
};

/**
 * PATCH /api/workorders/[id]/lines/[lineId]
 * Met à jour une ligne
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { lineId } = await context.params;
    const body = await request.json();

    // Récupérer le statut auto-entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();

    const data: Prisma.WorkOrderLineUpdateInput = {};
    if (body.description !== undefined) data.description = body.description;
    if (body.quantity !== undefined) data.quantity = parseInt(body.quantity);
    if (body.priceHT !== undefined) data.priceHT = parseFloat(body.priceHT);
    if (body.vatRate !== undefined) data.vatRate = isAutoEntrepreneur ? 0 : parseFloat(body.vatRate);
    if (body.duration !== undefined) data.duration = body.duration ? parseInt(body.duration) : null;
    if (body.notes !== undefined) data.notes = body.notes || null;

    const line = await prisma.workOrderLine.update({
      where: { id: lineId },
      data,
    });

    return NextResponse.json(line);
  } catch (error) {
    logger.error("[API] Error updating work order line:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la ligne" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/workorders/[id]/lines/[lineId]
 * Supprime une ligne
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { lineId } = await context.params;

    await prisma.workOrderLine.delete({
      where: { id: lineId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[API] Error deleting work order line:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la ligne" },
      { status: 500 },
    );
  }
}
