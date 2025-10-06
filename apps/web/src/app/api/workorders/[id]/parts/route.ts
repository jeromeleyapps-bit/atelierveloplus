import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { createWorkOrderPartSchema, validateRequest } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const rows = await prisma.workOrderPart.findMany({ where: { workOrderId: params.id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  const body = await req.json().catch(() => ({}));
  
  // Validate input with Zod
  const validation = validateRequest(createWorkOrderPartSchema, body);
  if (validation.success === false) {
    const err = validation.errors as any;
    const details = typeof err?.format === 'function' ? err.format() : err;
    return NextResponse.json({ 
      error: 'validation_failed', 
      details
    }, { status: 400 });
  }

  const data = validation.data;

  try {
    // Ensure work order exists (create minimal if missing)
    let wo = await prisma.workOrder.findUnique({ where: { id: params.id } });
    if (!wo) {
      wo = await prisma.workOrder.upsert({
        where: { id: params.id },
        update: {},
        create: { id: params.id, status: 'created' },
      });
    }

    // Validate catalog item id, ignore if not found to avoid FK error
    let catalogItemId: string | null = data.catalogItemId || null;
    if (catalogItemId) {
      const exists = await prisma.catalogItem.findUnique({ where: { id: catalogItemId } });
      if (!exists) catalogItemId = null;
    }

    const created = await prisma.workOrderPart.create({ 
      data: {
        workOrderId: params.id,
        catalogItemId,
        description: data.description,
        qty: data.qty,
        priceHT: data.priceHT,
        note: data.note || null,
      } 
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'part_create_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
