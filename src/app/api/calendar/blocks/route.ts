import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

const schema = z.object({
  reason: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const where: Prisma.CalendarBlockWhereInput = {};
    if (start && end) {
      where.start = { lt: new Date(end) };
      where.end = { gt: new Date(start) };
    }
    const items = await prisma.calendarBlock.findMany({ where, orderBy: { start: "asc" } });
    return NextResponse.json(items);
  } catch (error) {
    logger.error("[API] Error fetching calendar blocks:", error);
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { reason, start: s, end: e } = parsed.data;
    const start = new Date(s);
    const end = new Date(e);
    if (!(start < end)) return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
    const created = await prisma.calendarBlock.create({ data: { reason, start, end } });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("[API] Error creating calendar block:", error);
    return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
  }
}
