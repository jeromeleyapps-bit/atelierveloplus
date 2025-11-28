import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

const patchSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "done"]).optional(),
  // In future: allow editing other fields if needed
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
  const { id } = await params;

  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: Prisma.BookingUpdateInput = {};
  if (parsed.data.status) data.status = parsed.data.status;

  try {
    const updated = await prisma.booking.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Not found or update failed';
    logger.error("[API] Error updating booking:", { error: message });
    return NextResponse.json({ error: "Not found or update failed" }, { status: 404 });
  }
}
