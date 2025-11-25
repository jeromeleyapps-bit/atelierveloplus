import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

type Status = "created" | "in_progress" | "ready" | "delivered" | "completed";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const body = await req.json().catch(() => ({}));
  const status: Status | undefined = body?.status;
  const allowed = new Set(["created", "in_progress", "ready", "delivered", "completed"] as const);
  if (!status || !allowed.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  // Préparer données de mise à jour
  const updateData: Prisma.WorkOrderUpdateInput = { 
    status,
    updatedAt: new Date(),
  };

  // Si WorkOrder est complété → Set completedAt + Update customer lastServiceDate
  if (status === "delivered" || status === "completed") {
    updateData.completedAt = new Date();
    
    // Récupérer le WorkOrder pour avoir le customerId
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      select: { customerId: true, completedAt: true },
    });

    // Si c'est la première complétion (pas déjà complété) et qu'il y a un customer
    if (workOrder && workOrder.customerId && !workOrder.completedAt) {
      // Mettre à jour lastServiceDate du customer
      await prisma.customer.update({
        where: { id: workOrder.customerId },
        data: {
          lastServiceDate: updateData.completedAt,
          maintenanceReminderSent: false, // Reset pour permettre nouveau rappel dans 6 mois
          updatedAt: new Date(),
        },
      });
      logger.info(`[WorkOrder] ✅ Customer ${workOrder.customerId} lastServiceDate updated`);
    }
  }

  const row = await prisma.workOrder.update({ 
    where: { id }, 
    data: updateData 
  });
  
  return NextResponse.json(row, { status: 200 });
}
