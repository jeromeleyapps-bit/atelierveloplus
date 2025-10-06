import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

function parseIndexMaybe(param: string): number | null {
  const n = Number(param);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

// GET /api/customers/:id/bikes/:bikeId
export async function GET(_req: Request, { params }: { params: { id: string; bikeId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const { id: customerId, bikeId } = params;
  let bike = await prisma.customerBike.findFirst({ where: { id: bikeId, customerId } });
  if (!bike) {
    const idx = parseIndexMaybe(bikeId);
    if (idx) {
      bike = await prisma.customerBike.findUnique({ where: { customerId_index: { customerId, index: idx } } });
    }
  }
  if (!bike) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(bike, { status: 200 });
}

// PATCH /api/customers/:id/bikes/:bikeId
export async function PATCH(req: Request, { params }: { params: { id: string; bikeId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const { id: customerId, bikeId } = params;

  try {
    const schema = z.object({
      brand: z.string().trim().min(1).optional().nullable(),
      model: z.string().trim().min(1).optional().nullable(),
      serialNumber: z.string().trim().min(1).optional().nullable(),
      color: z.string().trim().min(1).optional().nullable(),
      notes: z.string().trim().optional().nullable(),
      nationalFileId: z.string().trim().optional().nullable(),
      index: z.number().int().min(1).optional(),
    });
    const body = schema.parse(await req.json().catch(() => ({})));
    const data: any = {
      ...(body.brand !== undefined ? { brand: body.brand ?? null } : {}),
      ...(body.model !== undefined ? { model: body.model ?? null } : {}),
      ...(body.serialNumber !== undefined ? { serialNumber: body.serialNumber ?? null } : {}),
      ...(body.color !== undefined ? { color: body.color ?? null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
      ...(body.nationalFileId !== undefined ? { nationalFileId: body.nationalFileId ?? null } : {}),
    };
    if (typeof body.index === "number") {
      data.index = body.index;
    }

    let existing = await prisma.customerBike.findFirst({ where: { id: bikeId, customerId } });
    let updated;
    if (!existing) {
      const idx = parseIndexMaybe(bikeId);
      if (!idx) return NextResponse.json({ error: "not_found" }, { status: 404 });
      existing = await prisma.customerBike.findUnique({ where: { customerId_index: { customerId, index: idx } } });
      if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
      updated = await prisma.customerBike.update({ where: { customerId_index: { customerId, index: idx } }, data });
    } else {
      updated = await prisma.customerBike.update({ where: { id: bikeId }, data });
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: "update_failed", message: e?.message }, { status: 400 });
  }
}

// DELETE /api/customers/:id/bikes/:bikeId
export async function DELETE(_req: Request, { params }: { params: { id: string; bikeId: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const { id: customerId, bikeId } = params;
  let existing = await prisma.customerBike.findFirst({ where: { id: bikeId, customerId } });
  if (existing) {
    await prisma.customerBike.delete({ where: { id: bikeId } });
  } else {
    const idx = parseIndexMaybe(bikeId);
    if (!idx) return NextResponse.json({ error: "not_found" }, { status: 404 });
    existing = await prisma.customerBike.findUnique({ where: { customerId_index: { customerId, index: idx } } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.customerBike.delete({ where: { customerId_index: { customerId, index: idx } } });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
