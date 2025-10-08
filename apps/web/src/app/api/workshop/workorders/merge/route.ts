import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    console.log('[MERGE] Starting merge operation...');
    const body = await req.json();
    const { workOrderIds } = body;
    console.log('[MERGE] Work order IDs:', workOrderIds);

    if (!Array.isArray(workOrderIds) || workOrderIds.length < 2) {
      console.log('[MERGE] Error: Not enough work orders');
      return NextResponse.json({ error: "Au moins 2 tickets requis" }, { status: 400 });
    }

    // Récupérer tous les tickets
    console.log('[MERGE] Fetching work orders...');
    const workOrders = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
    });
    console.log('[MERGE] Found work orders:', workOrders.length);

    if (workOrders.length !== workOrderIds.length) {
      console.log('[MERGE] Error: Some work orders not found');
      return NextResponse.json({ error: "Certains tickets n'existent pas" }, { status: 404 });
    }

    // Vérifier qu'ils ont tous le même client
    const customerIds = [...new Set(workOrders.map(wo => wo.customerId))];
    console.log('[MERGE] Customer IDs:', customerIds);
    if (customerIds.length > 1) {
      console.log('[MERGE] Error: Different customers');
      return NextResponse.json({ error: "Les tickets doivent appartenir au même client" }, { status: 400 });
    }

    // Créer un nouveau ticket fusionné
    console.log('[MERGE] Creating merged ticket...');
    
    // Récupérer toutes les pièces de tous les tickets
    const allParts = await prisma.workOrderPart.findMany({
      where: { workOrderId: { in: workOrderIds } },
    });
    console.log('[MERGE] Found parts:', allParts.length);

    // Utiliser une transaction pour garantir la cohérence
    console.log('[MERGE] Starting transaction...');
    const merged = await prisma.$transaction(async (tx) => {
      // 1. Créer un nouveau ticket fusionné
      const newTicket = await tx.workOrder.create({
        data: {
          customerId: workOrders[0].customerId,
          bikeId: workOrders[0].bikeId,
          type: workOrders[0].type,
          status: 'created',
        },
      });
      console.log('[MERGE] New ticket created:', newTicket.id);

      // 2. Copier toutes les pièces vers le nouveau ticket
      for (const part of allParts) {
        await tx.workOrderPart.create({
          data: {
            workOrderId: newTicket.id,
            catalogItemId: part.catalogItemId,
            description: part.description,
            qty: part.qty,
            priceHT: part.priceHT,
            note: part.note,
          },
        });
      }
      console.log('[MERGE] Copied all parts to new ticket');

      // 3. Supprimer les anciens tickets
      await tx.workOrder.deleteMany({
        where: { id: { in: workOrderIds } },
      });
      console.log('[MERGE] Deleted old tickets');

      console.log('[MERGE] Transaction complete!');
      return newTicket;
    });

    return NextResponse.json(merged, { status: 200 });
  } catch (e: any) {
    return handleApiError(e, 'MERGE');
  }
}
