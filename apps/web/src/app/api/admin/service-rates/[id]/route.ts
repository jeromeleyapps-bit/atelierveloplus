import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/admin/service-rates/[id]
 * Met à jour une prestation
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.priceHT !== undefined) data.priceHT = parseFloat(body.priceHT);
    if (body.bikeType !== undefined) data.bikeType = body.bikeType || null;
    if (body.category !== undefined) data.category = body.category || null;
    if (body.duration !== undefined) data.duration = body.duration ? parseInt(body.duration) : null;
    if (body.active !== undefined) data.active = body.active;

    const serviceRate = await prisma.serviceRate.update({
      where: { id },
      data,
    });

    return NextResponse.json(serviceRate);
  } catch (error) {
    console.error("[API] Error updating service rate:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la prestation" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/service-rates/[id]
 * Supprime une prestation
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    await prisma.serviceRate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting service rate:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la prestation" },
      { status: 500 },
    );
  }
}
