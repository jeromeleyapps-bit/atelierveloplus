import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workorders/[id]/lines
 * Récupère toutes les lignes d'un ticket
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    let lines = await prisma.workOrderLine.findMany({
      where: { workOrderId: id },
      orderBy: { createdAt: "asc" },
    });

    // Récupérer le statut auto-entrepreneur
    const firstUser = await prisma.user.findFirst();
    const settings = firstUser 
      ? await prisma.appSetting.findUnique({ where: { userId: firstUser.id } })
      : null;
    const isAutoEntrepreneur = settings?.isAutoEntrepreneur || false;

    // Forcer TVA à 0 si auto-entrepreneur
    if (isAutoEntrepreneur) {
      lines = lines.map((line: any) => ({
        ...line,
        vatRate: 0,
      }));
    }

    return NextResponse.json({ lines });
  } catch (error) {
    console.error("[API] Error fetching work order lines:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des lignes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/workorders/[id]/lines
 * Ajoute une ligne à un ticket
 */
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Récupérer le statut auto-entrepreneur
    const firstUser = await prisma.user.findFirst();
    const settings = firstUser 
      ? await prisma.appSetting.findUnique({ where: { userId: firstUser.id } })
      : null;
    const isAutoEntrepreneur = settings?.isAutoEntrepreneur || false;

    const line = await prisma.workOrderLine.create({
      data: {
        workOrderId: id,
        type: body.type, // 'service' | 'part' | 'manual'
        description: body.description,
        quantity: body.quantity || 1,
        priceHT: parseFloat(body.priceHT),
        vatRate: isAutoEntrepreneur ? 0 : parseFloat(body.vatRate),
        duration: body.duration ? parseInt(body.duration) : null,
        sourceId: body.sourceId || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating work order line:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la ligne" },
      { status: 500 },
    );
  }
}
