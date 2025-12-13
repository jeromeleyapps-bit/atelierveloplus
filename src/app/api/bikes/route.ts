import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureSqliteBikeMileageColumn } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/jwt";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/bikes - Liste vélos avec filtres
export async function GET(req: NextRequest) {
  try {
    await ensureSqliteBikeMileageColumn(prisma);
    const user = await getUserFromToken(req);
    let userId = user?.userId;
    
    // Fallback: premier utilisateur actif
    if (!userId || userId === 'electron-local') {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      userId = firstUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    }

    // Filtres depuis query params
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const condition = searchParams.get('condition');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const activeOnly = searchParams.get('active') !== 'false';

    // Construction filtres Prisma
    const where: Prisma.BikeWhereInput = {
      userId,
      active: activeOnly ? true : undefined,
    };

    if (type) where.type = type;
    if (condition) where.condition = condition;
    if (brand) where.brand = { contains: brand };
    if (minPrice || maxPrice) {
      where.sellingPriceHT = {};
      if (minPrice) where.sellingPriceHT.gte = parseFloat(minPrice);
      if (maxPrice) where.sellingPriceHT.lte = parseFloat(maxPrice);
    }

    const bikes = await prisma.bike.findMany({
      where,
      orderBy: [
        { active: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json(bikes);
  } catch (error) {
    logger.error('[GET /api/bikes] Error:', error);
    const message = error instanceof Error ? error.message : 'fetch_failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST /api/bikes - Créer vélo
export async function POST(req: NextRequest) {
  try {
    await ensureSqliteBikeMileageColumn(prisma);
    const user = await getUserFromToken(req);
    let userId = user?.userId;
    
    // Fallback: premier utilisateur actif
    if (!userId || userId === 'electron-local') {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      userId = firstUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    }

    const body = await req.json();
    
    // Validation champs requis
    if (!body.brand || !body.model || !body.year || !body.size) {
      return NextResponse.json(
        { error: 'missing_required_fields', required: ['brand', 'model', 'year', 'size'] },
        { status: 400 }
      );
    }

    if (!body.purchasePriceHT || !body.sellingPriceHT) {
      return NextResponse.json(
        { error: 'missing_prices', required: ['purchasePriceHT', 'sellingPriceHT'] },
        { status: 400 }
      );
    }

    // Création vélo
    const bike = await prisma.bike.create({
      data: {
        userId,
        type: body.type || 'ROAD',
        condition: body.condition || 'NEW',
        brand: body.brand,
        model: body.model,
        year: parseInt(body.year),
        size: body.size,
        color: body.color || null,
        serialNumber: body.serialNumber || null,
        frameSize: body.frameSize || null,
        frameMaterial: body.frameMaterial || null,
        wheelSize: body.wheelSize || null,
        weight: body.weight ? parseFloat(body.weight) : null,
        groupset: body.groupset || null,
        brakeType: body.brakeType || null,
        drivetrain: body.drivetrain || null,
        fork: body.fork || null,
        wheels: body.wheels || null,
        isElectric: body.isElectric || false,
        motor: body.motor || null,
        battery: body.battery ? parseInt(body.battery) : null,
        range: body.range ? parseInt(body.range) : null,
        mileage: body.mileage ? parseInt(body.mileage) : null,
        conditionNotes: body.conditionNotes || null,
        maintenanceHistory: body.maintenanceHistory || null,
        purchasePriceHT: parseFloat(body.purchasePriceHT),
        sellingPriceHT: parseFloat(body.sellingPriceHT),
        vatRate: body.vatRate ? parseFloat(body.vatRate) : 0.20,
        stock: body.stock ? parseInt(body.stock) : 1,
        location: body.location || null,
        photos: body.photos || null, // String séparé par virgules
        internalNotes: body.internalNotes || null,
        active: body.active !== false,
      },
    });

    return NextResponse.json(bike, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/bikes] Error:', error);
    
    // Gestion erreur serialNumber unique
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta?.target && Array.isArray(error.meta.target) && error.meta.target.includes('serialNumber')) {
        return NextResponse.json(
          { error: 'serial_number_exists', message: 'Ce numéro de série existe déjà' },
          { status: 409 }
        );
      }
    }
    
    const message = error instanceof Error ? error.message : 'creation_failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
