import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function GET(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  let userId = getUserId(req);
  
  console.log('[SETTINGS GET] userId from header:', userId);
  
  // En développement, si pas d'userId, utiliser le premier utilisateur
  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    console.log('[SETTINGS GET] No userId, using first user:', firstUser?.id);
    if (!firstUser) return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    userId = firstUser.id;
  }
  
  // Si l'utilisateur n'existe pas, utiliser le premier
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists) {
    console.log('[SETTINGS GET] User not found, switching to first user');
    const firstUser = await prisma.user.findFirst();
    if (firstUser) userId = firstUser.id;
  }
  
  console.log('[SETTINGS GET] Final userId:', userId);
  const row = await prisma.appSetting.findUnique({ where: { userId } });
  console.log('[SETTINGS GET] Found settings:', !!row, 'isAE:', row?.isAutoEntrepreneur);
  return NextResponse.json({
    shopName: row?.shopName ?? null,
    shopEmail: row?.shopEmail ?? null,
    shopPhone: row?.shopPhone ?? null,
    address1: row?.address1 ?? null,
    address2: row?.address2 ?? null,
    zip: row?.zip ?? null,
    city: row?.city ?? null,
    country: row?.country ?? null,
    pdfPrimary: row?.pdfPrimary ?? null,
    legalFooter: row?.legalFooter ?? null,
    siret: row?.siret ?? null,
    tva: row?.tva ?? null,
    rcs: row?.rcs ?? null,
    capital: row?.capital ?? null,
    insurance: row?.insurance ?? null,
    isAutoEntrepreneur: row?.isAutoEntrepreneur ?? false,
  }, { status: 200 });
}

export async function PATCH(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  let userId = getUserId(req);
  
  console.log('[SETTINGS] PATCH - userId from header:', userId);
  
  // En développement, si pas d'userId, utiliser le premier utilisateur
  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    console.log('[SETTINGS] No userId, using first user:', firstUser?.id);
    if (!firstUser) return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    userId = firstUser.id;
  }
  
  // Vérifier que l'utilisateur existe
  let userExists = await prisma.user.findUnique({ where: { id: userId } });
  console.log('[SETTINGS] User exists:', !!userExists, 'userId:', userId);
  
  if (!userExists) {
    // Si l'utilisateur n'existe pas, utiliser le premier utilisateur disponible
    console.log('[SETTINGS] User not found, using first available user');
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      return NextResponse.json({ error: "no_user_in_database" }, { status: 404 });
    }
    userId = firstUser.id;
    userExists = firstUser;
    console.log('[SETTINGS] Switched to user:', userId);
  }
  
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.shopName === 'string') data.shopName = body.shopName;
  if (typeof body.shopEmail === 'string') data.shopEmail = body.shopEmail;
  if (typeof body.shopPhone === 'string') data.shopPhone = body.shopPhone;
  if (typeof body.address1 === 'string') data.address1 = body.address1;
  if (typeof body.address2 === 'string') data.address2 = body.address2;
  if (typeof body.zip === 'string') data.zip = body.zip;
  if (typeof body.city === 'string') data.city = body.city;
  if (typeof body.country === 'string') data.country = body.country;
  if (typeof body.pdfPrimary === 'string') data.pdfPrimary = body.pdfPrimary;
  if (typeof body.legalFooter === 'string') data.legalFooter = body.legalFooter;
  if (typeof body.siret === 'string') data.siret = body.siret;
  if (typeof body.tva === 'string') data.tva = body.tva;
  if (typeof body.rcs === 'string') data.rcs = body.rcs;
  if (typeof body.capital === 'string') data.capital = body.capital;
  if (typeof body.insurance === 'string') data.insurance = body.insurance;
  if (typeof body.isAutoEntrepreneur === 'boolean') data.isAutoEntrepreneur = body.isAutoEntrepreneur;
  
  console.log('[SETTINGS] Data to save:', JSON.stringify(data, null, 2));
  
  // Chercher un AppSetting existant pour cet utilisateur
  const existing = await prisma.appSetting.findUnique({ where: { userId } });
  console.log('[SETTINGS] Existing setting found:', !!existing);
  
  let saved;
  if (existing) {
    // Mettre à jour l'existant
    saved = await prisma.appSetting.update({ where: { userId }, data });
    console.log('[SETTINGS] Updated existing setting');
  } else {
    // Créer un nouveau (avec upsert pour gérer les conflits)
    saved = await prisma.appSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
    console.log('[SETTINGS] Created new setting');
  }
  return NextResponse.json({
    shopName: saved.shopName ?? null,
    shopEmail: saved.shopEmail ?? null,
    shopPhone: saved.shopPhone ?? null,
    address1: saved.address1 ?? null,
    address2: saved.address2 ?? null,
    zip: saved.zip ?? null,
    city: saved.city ?? null,
    country: saved.country ?? null,
    pdfPrimary: saved.pdfPrimary ?? null,
    legalFooter: saved.legalFooter ?? null,
    siret: saved.siret ?? null,
    tva: saved.tva ?? null,
    rcs: saved.rcs ?? null,
    capital: saved.capital ?? null,
    insurance: saved.insurance ?? null,
    isAutoEntrepreneur: saved.isAutoEntrepreneur ?? false,
  }, { status: 200 });
}
