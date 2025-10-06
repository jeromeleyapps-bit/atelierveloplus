import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Status = "created" | "in_progress" | "ready" | "delivered";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const status: Status | undefined = body?.status;
  const allowed = new Set(["created", "in_progress", "ready", "delivered"] as const);
  if (!status || !allowed.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const row = await prisma.workOrder.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json(row, { status: 200 });
}
