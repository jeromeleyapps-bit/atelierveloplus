import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/pos/workorders/[id]/quote
 * Génère un devis à partir d'un ordre de réparation
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    // Récupérer les paramètres utilisateur pour vérifier le statut auto-entrepreneur
    const userSettings = await prisma.appSetting.findFirst({
      select: {
        isAutoEntrepreneur: true,
      },
    });

    const isAutoEntrepreneur = userSettings?.isAutoEntrepreneur || false;

    // Récupérer le workorder avec ses pièces
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        lines: true,
        customer: true,
        bike: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Ordre de réparation non trouvé" },
        { status: 404 },
      );
    }

    // Calculer le coût de la main d'œuvre
    const laborCostHT =
      workOrder.estimatedMinutes && workOrder.hourlyRate
        ? (workOrder.estimatedMinutes / 60) * workOrder.hourlyRate
        : 0;

    // Calculer le coût des pièces
    const partsCostHT = workOrder.lines.reduce(
      (sum, line) => sum + line.priceHT * line.quantity,
      0,
    );

    // TVA différenciée: 10% pour main d'œuvre (réparation), 20% pour pièces
    // SAUF si auto-entrepreneur: TVA à 0%
    const laborTvaRate = isAutoEntrepreneur ? 0 : 0.1; // 10% pour prestations de réparation vélo (0% si AE)
    const partsTvaRate = isAutoEntrepreneur ? 0 : 0.2;  // 20% pour pièces (0% si AE)

    const laborTVA = laborCostHT * laborTvaRate;
    const partsTVA = partsCostHT * partsTvaRate;

    // Total HT
    const totalHT = laborCostHT + partsCostHT;

    // Total TVA
    const totalTVA = laborTVA + partsTVA;

    // Total TTC
    const totalTTC = totalHT + totalTVA;

    // Construire les lignes du devis
    const lines = [];

    // Ligne main d'œuvre
    if (laborCostHT > 0) {
      lines.push({
        description: `Main d'œuvre - ${workOrder.estimatedMinutes} minutes`,
        qty: 1,
        priceHT: laborCostHT,
        totalHT: laborCostHT,
      });
    }

    // Lignes pièces
    for (const line of workOrder.lines) {
      lines.push({
        description: line.description,
        qty: line.quantity,
        priceHT: line.priceHT,
        totalHT: line.priceHT * line.quantity,
      });
    }

    // Retourner le devis
    return NextResponse.json({
      workOrderId: workOrder.id,
      customerId: workOrder.customerId,
      customerName: workOrder.customer
        ? `${workOrder.customer.firstName} ${workOrder.customer.lastName}`
        : "Client inconnu",
      totalHT,
      tvaRate: isAutoEntrepreneur ? 0 : 0.15, // Taux moyen (0% si AE, sinon 10% MO + 20% pièces)
      totalTVA,
      totalTTC,
      currency: "EUR",
      lines,
      // Détails TVA
      laborTVA,
      partsTVA,
      laborTvaRate: isAutoEntrepreneur ? 0 : 0.1,
      partsTvaRate: isAutoEntrepreneur ? 0 : 0.2,
      isAutoEntrepreneur,
    });
  } catch (error) {
    console.error("[API] Error generating quote from work order:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du devis" },
      { status: 500 },
    );
  }
}
