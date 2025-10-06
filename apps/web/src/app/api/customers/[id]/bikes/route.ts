import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const id = params.id;
  const rows = await prisma.customerBike.findMany({ where: { customerId: id }, orderBy: { index: 'asc' } });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const customerId = params.id;
  try {
    const schema = z.object({
      brand: z.string().trim().min(1).optional().nullable(),
      model: z.string().trim().min(1).optional().nullable(),
      serialNumber: z.string().trim().min(1).optional().nullable(),
      color: z.string().trim().min(1).optional().nullable(),
      notes: z.string().trim().optional().nullable(),
      nationalFileId: z.string().trim().optional().nullable(),
    });
    const parsed = schema.parse(await req.json().catch(() => ({})));
    const data = {
      brand: parsed.brand ?? null,
      model: parsed.model ?? null,
      serialNumber: parsed.serialNumber ?? null,
      color: parsed.color ?? null,
      notes: parsed.notes ?? null,
      nationalFileId: parsed.nationalFileId ?? null,
    } as const;

    // next index per customer
    const last = await prisma.customerBike.findFirst({
      where: { customerId },
      orderBy: { index: 'desc' },
      select: { index: true },
    });
    const nextIndex = (last?.index ?? 0) + 1;

    const created = await prisma.customerBike.create({
      data: {
        customerId,
        index: nextIndex,
        ...data,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'create_failed', message: e?.message }, { status: 400 });
  }
}
