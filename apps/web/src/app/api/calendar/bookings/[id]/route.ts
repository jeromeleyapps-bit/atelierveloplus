import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "done"]).optional(),
  // In future: allow editing other fields if needed
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: any = {};
  if (parsed.data.status) data.status = parsed.data.status;

  try {
    const updated = await prisma.booking.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: "Not found or update failed" }, { status: 404 });
  }
}
