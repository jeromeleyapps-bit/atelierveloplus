import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
  const row = await prisma.workOrder.update({ where: { id: id }, data: { status: 'in_progress' } });
  return NextResponse.json(row, { status: 200 });
}
