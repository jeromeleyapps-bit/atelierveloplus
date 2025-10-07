import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST - Créer un RDV
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { appointmentDate, duration = 30 } = await req.json();
    const workOrderId = params.id;

    // Récupérer le ticket
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { customer: true, bike: true },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Calculer la fin du RDV
    const start = new Date(appointmentDate);
    const end = new Date(start.getTime() + duration * 60000);

    // Créer l'événement calendrier
    const event = await prisma.calendarEvent.create({
      data: {
        title: `Retour vélo - ${workOrder.customer?.name || "Client"}`,
        description: `Ticket #${workOrder.id.slice(-6)}${workOrder.bike ? ` - ${workOrder.bike.brand} ${workOrder.bike.model}` : ""}`,
        start,
        end,
        status: "planned",
        blocksAvail: true,
        color: "#4CAF50", // Vert pour retour vélo
      },
    });

    // Lier l'événement au ticket
    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        appointmentDate: start,
        calendarEventId: event.id,
      },
    });

    return NextResponse.json({ success: true, event, workOrder: updated });
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create appointment" },
      { status: 500 }
    );
  }
}

// DELETE - Annuler un RDV
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const workOrderId = params.id;

    // Récupérer le ticket
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder || !workOrder.calendarEventId) {
      return NextResponse.json({ error: "No appointment found" }, { status: 404 });
    }

    // Supprimer l'événement calendrier
    await prisma.calendarEvent.delete({
      where: { id: workOrder.calendarEventId },
    });

    // Mettre à jour le ticket
    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        appointmentDate: null,
        calendarEventId: null,
      },
    });

    return NextResponse.json({ success: true, workOrder: updated });
  } catch (error: any) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete appointment" },
      { status: 500 }
    );
  }
}

// PUT - Modifier un RDV
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { appointmentDate, duration = 30 } = await req.json();
    const workOrderId = params.id;

    // Récupérer le ticket
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder || !workOrder.calendarEventId) {
      return NextResponse.json({ error: "No appointment found" }, { status: 404 });
    }

    // Calculer la nouvelle fin
    const start = new Date(appointmentDate);
    const end = new Date(start.getTime() + duration * 60000);

    // Mettre à jour l'événement calendrier
    const event = await prisma.calendarEvent.update({
      where: { id: workOrder.calendarEventId },
      data: {
        start,
        end,
      },
    });

    // Mettre à jour le ticket
    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        appointmentDate: start,
      },
    });

    return NextResponse.json({ success: true, event, workOrder: updated });
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update appointment" },
      { status: 500 }
    );
  }
}
