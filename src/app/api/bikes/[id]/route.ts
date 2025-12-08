import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/bikes/[id] - Détails vélo
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const bike = await prisma.bike.findUnique({
      where: { id },
    });

    if (!bike) {
      return NextResponse.json({ error: 'bike_not_found' }, { status: 404 });
    }

    return NextResponse.json(bike);
  } catch (error) {
    const { id } = await context.params;
    logger.error(`[GET /api/bikes/${id}] Error:`, error);
    const message = error instanceof Error ? error.message : 'fetch_failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/bikes/[id] - Modifier vélo
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    // Vérifier que le vélo existe
    const existing = await prisma.bike.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'bike_not_found' }, { status: 404 });
    }

    // Construction data update (seulement champs fournis)
    const updateData: Prisma.BikeUpdateInput = {};
    
    if (body.type !== undefined) updateData.type = body.type;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.year !== undefined) updateData.year = parseInt(body.year);
    if (body.size !== undefined) updateData.size = body.size;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber;
    if (body.frameSize !== undefined) updateData.frameSize = body.frameSize;
    if (body.frameMaterial !== undefined) updateData.frameMaterial = body.frameMaterial;
    if (body.wheelSize !== undefined) updateData.wheelSize = body.wheelSize;
    if (body.weight !== undefined) updateData.weight = body.weight ? parseFloat(body.weight) : null;
    if (body.groupset !== undefined) updateData.groupset = body.groupset;
    if (body.brakeType !== undefined) updateData.brakeType = body.brakeType;
    if (body.drivetrain !== undefined) updateData.drivetrain = body.drivetrain;
    if (body.fork !== undefined) updateData.fork = body.fork;
    if (body.wheels !== undefined) updateData.wheels = body.wheels;
    if (body.isElectric !== undefined) updateData.isElectric = body.isElectric;
    if (body.motor !== undefined) updateData.motor = body.motor;
    if (body.battery !== undefined) updateData.battery = body.battery ? parseInt(body.battery) : null;
    if (body.range !== undefined) updateData.range = body.range ? parseInt(body.range) : null;
    if (body.conditionNotes !== undefined) updateData.conditionNotes = body.conditionNotes;
    if (body.maintenanceHistory !== undefined) updateData.maintenanceHistory = body.maintenanceHistory;
    if (body.purchasePriceHT !== undefined) updateData.purchasePriceHT = parseFloat(body.purchasePriceHT);
    if (body.sellingPriceHT !== undefined) updateData.sellingPriceHT = parseFloat(body.sellingPriceHT);
    if (body.vatRate !== undefined) updateData.vatRate = parseFloat(body.vatRate);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.location !== undefined) updateData.location = body.location;
    if (body.photos !== undefined) updateData.photos = body.photos;
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes;
    if (body.active !== undefined) updateData.active = body.active;

    const updatedBike = await prisma.bike.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedBike);
  } catch (error) {
    const { id } = await context.params;
    logger.error(`[PATCH /api/bikes/${id}] Error:`, error);
    
    // Gestion erreur serialNumber unique
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('serialNumber')) {
        return NextResponse.json(
          { error: 'serial_number_exists', message: 'Ce numéro de série existe déjà' },
          { status: 409 }
        );
      }
    }
    
    const message = error instanceof Error ? error.message : 'update_failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/bikes/[id] - Supprimer vélo (soft delete)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Hard delete (vraie suppression)
      await prisma.bike.delete({
        where: { id },
      });
    } else {
      // Soft delete (marquer inactif)
      await prisma.bike.update({
        where: { id },
        data: { active: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await context.params;
    logger.error(`[DELETE /api/bikes/${id}] Error:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'bike_not_found' }, { status: 404 });
    }
    
    const message = error instanceof Error ? error.message : 'delete_failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
