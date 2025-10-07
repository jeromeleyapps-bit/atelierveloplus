import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Liste des entrées de main d'œuvre pour un ticket
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const workOrderId = params.id;

    // Pour l'instant, on retourne un tableau vide
    // car il n'y a pas de table LaborEntry dans le schéma
    // Les données sont dans estimatedMinutes et hourlyRate du WorkOrder
    
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        estimatedMinutes: true,
        hourlyRate: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Retourner un format compatible avec l'ancien système
    const laborEntries = [];
    if (workOrder.estimatedMinutes && workOrder.estimatedMinutes > 0) {
      laborEntries.push({
        id: `labor-${workOrderId}`,
        workOrderId,
        minutes: workOrder.estimatedMinutes,
        note: "Temps estimé",
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(laborEntries);
  } catch (error: any) {
    console.error("Error fetching labor entries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch labor entries" },
      { status: 500 }
    );
  }
}

// POST - Ajouter une entrée de main d'œuvre (met à jour estimatedMinutes)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const workOrderId = params.id;
    const { minutes, note } = await req.json();

    // Mettre à jour le temps estimé du ticket
    const workOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        estimatedMinutes: minutes,
      },
    });

    return NextResponse.json({
      id: `labor-${workOrderId}`,
      workOrderId,
      minutes,
      note: note || "Temps estimé",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error adding labor entry:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add labor entry" },
      { status: 500 }
    );
  }
}
