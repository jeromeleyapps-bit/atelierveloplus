import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { calculateLaborCost } from "@/lib/labor-pricing";
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/pos/workorders/[id]/sale
 * Crée une vente (facture) à partir d'un ordre de réparation
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { id } = await context.params;

    // Récupérer le statut auto-entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();

    // Récupérer le workorder avec ses pièces
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { WorkOrderLine: true,
        Customer: true,
        CustomerBike: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Ordre de réparation non trouvé" },
        { status: 404 },
      );
    }

    if (!workOrder.customerId) {
      return NextResponse.json(
        { error: "Le workorder doit avoir un client associé" },
        { status: 400 },
      );
    }

    // Calculer le coût de la main d'œuvre (facturation par tranches de 30 min)
    const { laborCostHT } = await calculateLaborCost(
      workOrder.estimatedMinutes,
      workOrder.hourlyRate
    );

    // Calculer le coût des pièces
    const partsCostHT = workOrder.WorkOrderLine.reduce(
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

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        workOrderId: workOrder.id,
        status: "draft",
        type: "invoice",
        subtotalHT: totalHT,
        vatAmount: totalTVA,
        totalTTC,
        currency: "EUR",
        vatRate: isAutoEntrepreneur ? 0 : 15, // Taux moyen (0% si AE, sinon 10% MO + 20% pièces)
        InvoiceLine: { create: [
            // Ligne main d'œuvre
            ...(laborCostHT > 0
              ? [
                  {
                    type: "labor",
                    description: `Main d'œuvre - ${workOrder.estimatedMinutes} minutes`,
                    qty: 1,
                    unitPriceHT: laborCostHT,
                    unitPriceTTC: laborCostHT * (1 + laborTvaRate),
                    vatRate: laborTvaRate * 100, // 10%
                    totalHT: laborCostHT,
                    totalTTC: laborCostHT * (1 + laborTvaRate),
                  },
                ]
              : []),
            // Lignes pièces
            ...workOrder.WorkOrderLine.map((line) => ({
              type: "part",
              description: line.description,
              qty: line.quantity,
              unitPriceHT: line.priceHT,
              unitPriceTTC: line.priceHT * (1 + partsTvaRate),
              vatRate: partsTvaRate * 100, // 20%
              totalHT: line.priceHT * line.quantity,
              totalTTC: line.priceHT * line.quantity * (1 + partsTvaRate),
            })),
          ],
        },
      },
      include: { InvoiceLine: true },
    });

    // Mettre à jour le statut du workorder
    await prisma.workOrder.update({
      where: { id },
      data: { status: "invoiced" },
    });

    // Retourner le résultat
    return NextResponse.json({
      saleId: invoice.id,
      totals: {
        workOrderId: workOrder.id,
        customerId: workOrder.customerId,
        customerName: workOrder.Customer
          ? `${workOrder.Customer.firstName} ${workOrder.Customer.lastName}`
          : "Client inconnu",
        totalHT,
        tvaRate: isAutoEntrepreneur ? 0 : 0.15,
        totalTVA,
        totalTTC,
        currency: "EUR",
        lines: [
          ...(laborCostHT > 0
            ? [
                {
                  description: `Main d'œuvre - ${workOrder.estimatedMinutes} minutes`,
                  qty: 1,
                  priceHT: laborCostHT,
                  totalHT: laborCostHT,
                },
              ]
            : []),
          ...workOrder.WorkOrderLine.map((line) => ({
            description: line.description,
            qty: line.quantity,
            priceHT: line.priceHT,
            totalHT: line.priceHT * line.quantity,
          })),
        ],
      },
    });
  } catch (error) {
    logger.error("[API] Error creating sale from work order:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la vente" },
      { status: 500 },
    );
  }
}
