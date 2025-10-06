import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  status: z.enum(["planned","in_progress","done","cancelled"]).optional(),
  blocksAvail: z.boolean().optional(),
  color: z.string().optional(),
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
  const items = await prisma.calendarEvent.findMany({ where, orderBy: { start: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const start = new Date(data.start);
  const end = new Date(data.end);
  if (!(start < end)) return NextResponse.json({ error: "Invalid time range" }, { status: 400 });

  const created = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description,
      start,
      end,
      status: data.status ?? "planned",
      blocksAvail: data.blocksAvail ?? true,
      color: data.color,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
