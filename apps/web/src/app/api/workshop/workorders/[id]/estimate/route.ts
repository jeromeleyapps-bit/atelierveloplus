import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  try {
    const body = await req.json();
    const { estimatedMinutes, hourlyRate } = body;

    const updated = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        estimatedMinutes: estimatedMinutes !== undefined ? Number(estimatedMinutes) : undefined,
        hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : undefined,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    console.error("Error updating estimate:", e);
    return NextResponse.json({ error: e.message || "update_error" }, { status: 500 });
  }
}
