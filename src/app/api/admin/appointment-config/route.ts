import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { getLicenseInfo } from '@/lib/license-manager';

// GET: Récupérer la configuration RDV
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let config = await prisma.appointmentConfig.findUnique({
      where: { userId: user.userId },
    });

    // Si pas de config, créer une config par défaut
    if (!config) {
      config = await prisma.appointmentConfig.create({
        data: {
          userId: user.userId,
        },
      });
    }

    // Récupérer le numéro de téléphone depuis AppSetting si appointmentOnlyDayPhone est null
    let appointmentOnlyDayPhone = config.appointmentOnlyDayPhone;
    if (!appointmentOnlyDayPhone) {
      const appSetting = await prisma.appSetting.findUnique({
        where: { userId: user.userId },
        select: { shopPhone: true },
      });
      appointmentOnlyDayPhone = appSetting?.shopPhone || null;
    }

    return NextResponse.json({
      ...config,
      appointmentOnlyDayPhone,
    });
  } catch (error) {
    logger.error('APPOINTMENT CONFIG GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Mettre à jour la configuration RDV
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      openingDays,
      openingHours,
      appointmentOnlyDayEnabled,
      appointmentOnlyDay,
      appointmentOnlyDayPhone,
    } = body;

    // Vérifier la licence PRO pour appointmentOnlyDayEnabled
    if (appointmentOnlyDayEnabled) {
      const licenseInfo = await getLicenseInfo();
      const isPro = licenseInfo.tier === 'pro' || licenseInfo.tier === 'pro_lifetime' || licenseInfo.tier === 'trial_pro';
      if (!isPro) {
        return NextResponse.json(
          { error: 'Cette fonctionnalité nécessite une licence PRO' },
          { status: 403 }
        );
      }
    }

    // Récupérer le numéro de téléphone depuis AppSetting si non fourni
    let phone = appointmentOnlyDayPhone;
    if (!phone && appointmentOnlyDayEnabled) {
      const appSetting = await prisma.appSetting.findUnique({
        where: { userId: user.userId },
        select: { shopPhone: true },
      });
      phone = appSetting?.shopPhone || null;
    }

    const config = await prisma.appointmentConfig.upsert({
      where: { userId: user.userId },
      update: {
        openingDays: openingDays || undefined,
        openingHours: openingHours || undefined,
        appointmentOnlyDayEnabled: appointmentOnlyDayEnabled !== undefined ? appointmentOnlyDayEnabled : undefined,
        appointmentOnlyDay: appointmentOnlyDay || undefined,
        appointmentOnlyDayPhone: phone || undefined,
      },
      create: {
        userId: user.userId,
        openingDays: openingDays || '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
        openingHours: openingHours || '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"10:00","end":"17:00"},"sunday":{"start":"09:00","end":"18:00"}}',
        appointmentOnlyDayEnabled: appointmentOnlyDayEnabled || false,
        appointmentOnlyDay: appointmentOnlyDay || null,
        appointmentOnlyDayPhone: phone || null,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    logger.error('APPOINTMENT CONFIG PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

