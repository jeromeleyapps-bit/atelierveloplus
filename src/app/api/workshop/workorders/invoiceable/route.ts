import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * GET /api/workshop/workorders/invoiceable
 * 
 * Retourne la liste des tickets facturables:
 * - Ont du temps enregistré (estimatedMinutes > 0)
 * - Status: ready ou completed
 * - Pas encore facturés (pas de facture avec status != cancelled)
 * 
 * Utilisé par: Page factures pour sélection ticket
 */
export async function GET(_req: Request) {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    // 1. Récupérer tous les tickets avec temps enregistré
    const workOrders = await prisma.workOrder.findMany({
      where: {
        estimatedMinutes: {
          gt: 0, // Au moins 1 minute
        },
        status: {
          in: ["ready", "completed"], // Uniquement tickets terminés
        },
      },
      include: {
        Customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        CustomerBike: {
          select: {
            id: true,
            brand: true,
            model: true,
          },
        },
        WorkOrderLine: {
          select: {
            id: true,
            type: true,
            description: true,
            quantity: true,
            priceHT: true,
            vatRate: true,
          },
        },
        Invoice: {
          where: {
            status: {
              not: "cancelled", // Ignorer factures annulées
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // 2. Filtrer ceux qui n'ont pas déjà de facture
    const invoiceableWorkOrders = workOrders
      .filter(wo => wo.Invoice.length === 0) // Pas de facture active
      .map(wo => {
        // Calculer totaux pour info
        const totalHT = wo.WorkOrderLine.reduce((sum, line) => {
          return sum + (line.quantity * line.priceHT);
        }, 0);

        const customerName = wo.Customer
          ? `${wo.Customer.firstName || ""} ${wo.Customer.lastName || ""}`.trim() || wo.Customer.email || "Client inconnu"
          : "Client inconnu";

        const bikeName = wo.CustomerBike
          ? `${wo.CustomerBike.brand || ""} ${wo.CustomerBike.model || ""}`.trim() || "Vélo"
          : "Vélo";

        return {
          id: wo.id,
          status: wo.status,
          estimatedMinutes: wo.estimatedMinutes,
          createdAt: wo.createdAt,
          updatedAt: wo.updatedAt,
          customerId: wo.customerId,
          customerName,
          bikeId: wo.bikeId,
          bikeName,
          linesCount: wo.WorkOrderLine.length,
          totalHT: Math.round(totalHT * 100) / 100, // Arrondir 2 décimales
        };
      });

    logger.info(`[GET /invoiceable] Found ${invoiceableWorkOrders.length} invoiceable tickets`);

    return NextResponse.json(invoiceableWorkOrders, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error("[GET /invoiceable] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
