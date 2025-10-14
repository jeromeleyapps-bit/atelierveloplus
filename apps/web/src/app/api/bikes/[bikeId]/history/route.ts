import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ bikeId: string }>;
};

/**
 * GET /api/bikes/[bikeId]/history
 * Récupère l'historique complet des interventions sur un vélo
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { bikeId } = await context.params;

    // Récupérer le vélo avec toutes les informations
    const bike = await prisma.customerBike.findUnique({
      where: { id: bikeId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        workOrders: {
          include: {
            parts: {
              include: {
                catalogItem: true,
              },
            },
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
    const history = bike.workOrders.map((wo) => {
      // Calculer le coût total
      const partsCost = wo.parts.reduce(
        (sum, part) => sum + part.priceHT * part.qty,
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
        parts: wo.parts.map((part) => ({
          id: part.id,
          description: part.description,
          qty: part.qty,
          priceHT: part.priceHT,
          totalHT: part.priceHT * part.qty,
          note: part.note,
          catalogItem: part.catalogItem
            ? {
                id: part.catalogItem.id,
                name: part.catalogItem.name,
                sku: part.catalogItem.sku,
                category: part.catalogItem.category,
              }
            : null,
        })),
        inProgressAt: wo.inProgressAt,
        readyAt: wo.readyAt,
        appointmentDate: wo.appointmentDate,
      };
    });

    // Statistiques
    const stats = {
      totalInterventions: history.length,
      totalSpent: history.reduce((sum, h) => sum + h.totalCost, 0),
      lastIntervention: history[0]?.date || null,
      mostUsedParts: getMostUsedParts(bike.workOrders),
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
      customer: bike.customer,
      history,
      stats,
    });
  } catch (error) {
    console.error("[API] Error fetching bike history:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'historique" },
      { status: 500 },
    );
  }
}

/**
 * Calcule les pièces les plus utilisées
 */
function getMostUsedParts(workOrders: any[]): Array<{
  description: string;
  count: number;
  totalQty: number;
}> {
  const partsMap = new Map<
    string,
    { description: string; count: number; totalQty: number }
  >();

  for (const wo of workOrders) {
    for (const part of wo.parts || []) {
      const existing = partsMap.get(part.description);
      if (existing) {
        existing.count++;
        existing.totalQty += part.qty;
      } else {
        partsMap.set(part.description, {
          description: part.description,
          count: 1,
          totalQty: part.qty,
        });
      }
    }
  }

  return Array.from(partsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
