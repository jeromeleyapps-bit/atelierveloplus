import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getCalendarConfig, parseBusinessHours, isWithinBusinessHours, hasBlockConflict, hasEventBlockConflict, countOverlappingBookings } from "../../../../lib/calendar";

function addMinutes(d: Date, m: number) { return new Date(d.getTime() + m * 60000); }

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const startStr = url.searchParams.get("start");
  const endStr = url.searchParams.get("end");
  if (!startStr || !endStr) return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
  const rangeStart = new Date(startStr);
  const rangeEnd = new Date(endStr);
  if (!(rangeStart < rangeEnd)) return NextResponse.json({ error: "Invalid range" }, { status: 400 });

  const cfg = await getCalendarConfig();
  const slotMin = cfg.slotMinutes || 60;
  const leadH = cfg.leadTimeHours || 6;
  const maxC = cfg.maxConcurrent || 1;
  const hours = parseBusinessHours(cfg.businessHours);

  const now = new Date();
  const results: { start: string; end: string }[] = [];

  // Iterate day by day
  for (let day = new Date(rangeStart); day < rangeEnd; day = addMinutes(day, 24 * 60)) {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    // Build candidate slots inside the day window and overall requested window
    let cursor = new Date(Math.max(dayStart.getTime(), rangeStart.getTime()));
    while (cursor < dayEnd && cursor < rangeEnd) {
      const slotStart = new Date(cursor);
      const slotEnd = addMinutes(slotStart, slotMin);
      cursor = slotEnd;

      // keep only slots fully within request range
      if (slotEnd > rangeEnd) break;

      // lead time
      if (slotStart.getTime() - now.getTime() < leadH * 3600 * 1000) continue;

      // business hours (same-day rule inside helper)
      if (!isWithinBusinessHours(slotStart, slotEnd, hours)) continue;

      // conflicts
      // eslint-disable-next-line no-await-in-loop
      if (await hasBlockConflict(slotStart, slotEnd)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await hasEventBlockConflict(slotStart, slotEnd)) continue;
      // eslint-disable-next-line no-await-in-loop
      const overlapCount = await countOverlappingBookings(slotStart, slotEnd);
      if (overlapCount >= maxC) continue;

      results.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
    }
  }

  return NextResponse.json({ slots: results });
}
