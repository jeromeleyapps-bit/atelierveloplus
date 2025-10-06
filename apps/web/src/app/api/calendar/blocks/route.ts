import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { z } from "zod";

const schema = z.object({
  reason: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const where: any = {};
  if (start && end) {
    where.start = { lt: new Date(end) };
    where.end = { gt: new Date(start) };
  }
  const items = await prisma.calendarBlock.findMany({ where, orderBy: { start: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { reason, start: s, end: e } = parsed.data;
  const start = new Date(s);
  const end = new Date(e);
  if (!(start < end)) return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
  const created = await prisma.calendarBlock.create({ data: { reason, start, end } });
  return NextResponse.json(created, { status: 201 });
}
