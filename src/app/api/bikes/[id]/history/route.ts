import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/bikes/[id]/history
 * Récupère l'historique complet des interventions sur un vélo client (CustomerBike)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { id: bikeId } = await context.params;

    // Récupérer le vélo avec toutes les informations
    const bike = await prisma.customerBike.findUnique({
      where: { id: bikeId },
      include: {
        Customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        WorkOrder: {
          include: {
            WorkOrderLine: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!bike) {
      return NextResponse.json(
        { error: "Vélo non trouvé" },
        { status: 404 },
      );
    }

    // Construire l'historique détaillé
    const history = bike.WorkOrder.map((wo) => {
      // Calculer le coût total
      const partsCost = wo.WorkOrderLine.reduce(
        (sum, line) => sum + line.priceHT * line.quantity,
        0,
      );
      const laborCost =
        wo.estimatedMinutes && wo.hourlyRate
          ? (wo.estimatedMinutes / 60) * wo.hourlyRate
          : 0;
      const totalCost = partsCost + laborCost;

      return {
        id: wo.id,
        date: wo.createdAt,
        status: wo.status,
        type: wo.type || "repair",
        estimatedMinutes: wo.estimatedMinutes,
        hourlyRate: wo.hourlyRate,
        laborCost,
        partsCost,
        totalCost,
        parts: wo.WorkOrderLine.map((line) => ({
          id: line.id,
          description: line.description,
          qty: line.quantity,
          priceHT: line.priceHT,
          totalHT: line.priceHT * line.quantity,
          note: line.notes,
        })),
        appointmentDate: wo.appointmentDate,
      };
    });

    // Statistiques
    const stats = {
      totalInterventions: history.length,
      totalSpent: history.reduce((sum, h) => sum + h.totalCost, 0),
      lastIntervention: history[0]?.date || null,
      mostUsedParts: getMostUsedParts(bike.WorkOrder),
    };

    return NextResponse.json({
      bike: {
        id: bike.id,
        brand: bike.brand,
        model: bike.model,
        serialNumber: bike.serialNumber,
        color: bike.color,
        wheelSize: bike.wheelSize,
        tireSize: bike.tireSize,
        frameMaterial: bike.frameMaterial,
        frameSize: bike.frameSize,
        brakeType: bike.brakeType,
        gearSystem: bike.gearSystem,
        notes: bike.notes,
        createdAt: bike.createdAt,
      },
      customer: bike.Customer,
      history,
      stats,
    });
  } catch (error) {
    logger.error("[API] Error fetching bike history:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique" },
      { status: 500 },
    );
  }
}

/**
 * Calcule les pièces les plus utilisées
 */
function getMostUsedParts(workOrders: unknown[]): Array<{
  description: string;
  count: number;
  totalQty: number;
}> {
  const partsMap = new Map<
    string,
    { description: string; count: number; totalQty: number }
  >();

  for (const wo of workOrders) {
    for (const line of (wo as { WorkOrderLine?: Array<{ description: string; quantity: number }> }).WorkOrderLine || []) {
      const existing = partsMap.get(line.description);
      if (existing) {
        existing.count++;
        existing.totalQty += line.quantity;
      } else {
        partsMap.set(line.description, {
          description: line.description,
          count: 1,
          totalQty: line.quantity,
        });
      }
    }
  }

  return Array.from(partsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
