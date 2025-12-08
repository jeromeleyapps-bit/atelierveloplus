import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { handleApiError, ValidationError, NotFoundError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import

  try {
    const body = await req.json();
    const { workOrderIds } = body;
    
    logger.info('WORKORDER MERGE: Starting merge operation', { workOrderIds });

    if (!Array.isArray(workOrderIds) || workOrderIds.length < 2) {
      throw new ValidationError('Au moins 2 tickets requis');
    }

    // Récupérer tous les tickets avec leurs lignes
    logger.debug('WORKORDER MERGE: Fetching work orders');
    const workOrders = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      include: { WorkOrderLine: true
      }
    });
    
    logger.debug('WORKORDER MERGE: Work orders found', { count: workOrders.length });

    if (workOrders.length !== workOrderIds.length) {
      throw new NotFoundError('Certains tickets n\'existent pas');
    }

    // Vérifier qu'ils ont tous le même client
    const customerIds = [...new Set(workOrders.map(wo => wo.customerId))];
    logger.debug('WORKORDER MERGE: Customer IDs check', { customerIds });
    if (customerIds.length > 1) {
      throw new ValidationError('Les tickets doivent appartenir au même client');
    }

    // Utiliser une transaction pour garantir la cohérence
    logger.info('WORKORDER MERGE: Starting transaction');
    const merged = await prisma.$transaction(async (tx) => {
      // 1. Créer un nouveau ticket fusionné
      const newTicket = await tx.workOrder.create({
        data: {
          customerId: workOrders[0].customerId,
          bikeId: workOrders[0].bikeId,
          type: workOrders[0].type || 'repair',
          status: 'created',
          estimatedMinutes: workOrders.reduce((sum, wo) => sum + (wo.estimatedMinutes || 0), 0),
          hourlyRate: workOrders[0].hourlyRate,
        },
      });
      logger.debug('WORKORDER MERGE: New ticket created', { ticketId: newTicket.id });

      // 2. Copier toutes les lignes des anciens tickets vers le nouveau
      const allLines = workOrders.flatMap(wo => wo.WorkOrderLine);
      logger.debug('WORKORDER MERGE: Lines to merge', { lineCount: allLines.length });

      for (const line of allLines) {
        await tx.workOrderLine.create({
          data: {
            workOrderId: newTicket.id,
            type: line.type,
            description: line.description,
            quantity: line.quantity,
            priceHT: line.priceHT,
            vatRate: line.vatRate,
            duration: line.duration,
            sourceId: line.sourceId,
            notes: line.notes,
          },
        });
      }
      logger.debug('WORKORDER MERGE: Lines copied to new ticket');

      // 3. Mettre à jour le statut des anciens tickets au lieu de les supprimer
      await tx.workOrder.updateMany({
        where: { 
          id: { 
            in: workOrderIds.filter(id => id !== newTicket.id) // Exclure le nouveau ticket
          } 
        },
        data: { 
          status: 'merged'
          // Note: Le champ mergedIntoId n'existe pas dans le modèle
          // Nous pourrions l'ajouter au schéma si nécessaire
        },
      });
      logger.info('WORKORDER MERGE: Old tickets status updated');

      logger.info('WORKORDER MERGE: Transaction completed', { newTicketId: newTicket.id });
      return newTicket;
    });

    return NextResponse.json(merged, { status: 200 });
  } catch (e: unknown) {
    return handleApiError(e, 'POST /api/workshop/workorders/merge');
  }
}
