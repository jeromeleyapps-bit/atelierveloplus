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
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const row = await prisma.appSetting.findUnique({ where: { userId } });
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
  }, { status: 200 });
}

export async function PATCH(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  const existing = await prisma.appSetting.findUnique({ where: { userId } });
  const saved = existing
    ? await prisma.appSetting.update({ where: { userId }, data })
    : await prisma.appSetting.create({ data: { userId, ...data } });
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
  }, { status: 200 });
}
