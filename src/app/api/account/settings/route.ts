import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

// Interface pour les données de settings
interface AppSettingData {
  shopName?: string | null;
  shopEmail?: string;
  shopPhone?: string;
  address1?: string;
  address2?: string;
  zip?: string;
  city?: string;
  country?: string;
  shopLogo?: string;
  legalFooter?: string;
  siret?: string;
  tva?: string;
  rcs?: string;
  capital?: string;
  insurance?: string;
  isAutoEntrepreneur?: boolean;
}

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function GET(req: Request) {
  try {
    let userId = getUserId(req);

    logger.debug('SETTINGS GET: User ID from header', { userId });

  // Fallback : prendre le premier user existant (jamais en créer un par défaut).
  // Sprint 4.B : on supprime la création automatique d'un user "Administrateur"
  // qui polluait les bases neuves au premier lancement.
  if (!userId) {
    const firstUser = await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    if (!firstUser) {
      logger.info('SETTINGS GET: no user in DB, returning empty settings (fresh install)');
      return NextResponse.json({ noUser: true }, { status: 404 });
    }
    userId = firstUser.id;
  } else {
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      const firstUser = await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
      if (!firstUser) {
        return NextResponse.json({ noUser: true }, { status: 404 });
      }
      userId = firstUser.id;
    }
  }

  logger.debug('SETTINGS GET: Final user ID', { userId });
  const row = await prisma.appSetting.findUnique({ where: { userId } });
  logger.debug('SETTINGS GET: Settings found', { found: !!row, isAutoEntrepreneur: row?.isAutoEntrepreneur });
  
  // Charger User.name pour afficher firstName/lastName (Bug #5)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const userName = user?.name || '';
  const [firstName = '', lastName = ''] = userName.split(' ', 2);
  logger.debug('SETTINGS GET: User name parsed', { userName, firstName, lastName });
  
  return NextResponse.json({
    firstName: firstName || null,
    lastName: lastName || null,
    shopName: row?.shopName ?? null,
    shopEmail: row?.shopEmail ?? null,
    shopPhone: row?.shopPhone ?? null,
    address1: row?.address1 ?? null,
    address2: row?.address2 ?? null,
    zip: row?.zip ?? null,
    city: row?.city ?? null,
    country: row?.country ?? null,
    shopLogo: row?.shopLogo ?? null,
    legalFooter: row?.legalFooter ?? null,
    siret: row?.siret ?? null,
    tva: row?.tva ?? null,
    rcs: row?.rcs ?? null,
    capital: row?.capital ?? null,
    insurance: row?.insurance ?? null,
    isAutoEntrepreneur: row?.isAutoEntrepreneur ?? false,
    updatedAt: row?.updatedAt || new Date(),
  }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'GET /api/account/settings');
  }
}

// Alias PUT vers PATCH pour compatibilité
export async function PUT(req: Request) {
  return PATCH(req);
}

export async function PATCH(req: Request) {
  try {
    let userId = getUserId(req);

    logger.info('SETTINGS PATCH: Request received', { userId });

  // Sprint 4.B : on n'auto-crée plus de user. Si la DB est vide, on refuse.
  if (!userId) {
    const firstUser = await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
    if (!firstUser) {
      return NextResponse.json({ error: 'no_user', message: 'Inscription requise' }, { status: 404 });
    }
    userId = firstUser.id;
  } else {
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      const firstUser = await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } });
      if (!firstUser) {
        return NextResponse.json({ error: 'no_user', message: 'Inscription requise' }, { status: 404 });
      }
      userId = firstUser.id;
    }
  }
  
  const body = await req.json().catch(() => ({}));
  
  logger.debug('SETTINGS PATCH: Shop logo debug', { 
    shopLogo: body.shopLogo, 
    type: typeof body.shopLogo,
    isString: typeof body.shopLogo === 'string'
  });
  
  const data: AppSettingData = {};
  if (typeof body.shopName === 'string' || body.shopName === null) data.shopName = body.shopName;
  if (typeof body.shopEmail === 'string') data.shopEmail = body.shopEmail;
  if (typeof body.shopPhone === 'string') data.shopPhone = body.shopPhone;
  if (typeof body.address1 === 'string') data.address1 = body.address1;
  if (typeof body.address2 === 'string') data.address2 = body.address2;
  if (typeof body.zip === 'string') data.zip = body.zip;
  if (typeof body.city === 'string') data.city = body.city;
  if (typeof body.country === 'string') data.country = body.country;
  if (typeof body.shopLogo === 'string') {
    data.shopLogo = body.shopLogo;
    logger.debug('SETTINGS PATCH: Shop logo added to data', { shopLogo: data.shopLogo });
  } else {
    logger.debug('SETTINGS PATCH: Shop logo not added (not string or null)');
  }
  if (typeof body.legalFooter === 'string') data.legalFooter = body.legalFooter;
  if (typeof body.siret === 'string') data.siret = body.siret;
  if (typeof body.tva === 'string') data.tva = body.tva;
  if (typeof body.rcs === 'string') data.rcs = body.rcs;
  if (typeof body.capital === 'string') data.capital = body.capital;
  if (typeof body.insurance === 'string') data.insurance = body.insurance;
  if (typeof body.isAutoEntrepreneur === 'boolean') data.isAutoEntrepreneur = body.isAutoEntrepreneur;
  
  logger.debug('SETTINGS PATCH: Data to save', { data });
  
  // Chercher un AppSetting existant pour cet utilisateur
  const existing = await prisma.appSetting.findUnique({ where: { userId } });
  logger.debug('SETTINGS PATCH: Existing setting check', { found: !!existing });
  
  let saved;
  if (existing) {
    // Mettre à jour l'existant
    saved = await prisma.appSetting.update({ where: { userId }, data });
    logger.info('SETTINGS PATCH: Updated existing setting', { userId });
  } else {
    // Créer un nouveau (avec upsert pour gérer les conflits)
    saved = await prisma.appSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
    logger.info('SETTINGS PATCH: Created new setting', { userId });
  }
  
  // Charger User.name pour cohérence avec GET (Bug #5)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const userName = user?.name || '';
  const [firstName = '', lastName = ''] = userName.split(' ', 2);
  
  return NextResponse.json({
    firstName: firstName || null,
    lastName: lastName || null,
    shopName: saved.shopName ?? null,
    shopEmail: saved.shopEmail ?? null,
    shopPhone: saved.shopPhone ?? null,
    address1: saved.address1 ?? null,
    address2: saved.address2 ?? null,
    zip: saved.zip ?? null,
    city: saved.city ?? null,
    country: saved.country ?? null,
    shopLogo: saved.shopLogo ?? null,
    legalFooter: saved.legalFooter ?? null,
    siret: saved.siret ?? null,
    tva: saved.tva ?? null,
    rcs: saved.rcs ?? null,
    capital: saved.capital ?? null,
    insurance: saved.insurance ?? null,
    isAutoEntrepreneur: saved.isAutoEntrepreneur ?? false,
    updatedAt: saved.updatedAt,
  }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/account/settings');
  }
}
