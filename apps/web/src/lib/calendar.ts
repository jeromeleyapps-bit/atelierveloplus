import prisma from "../lib/prisma";

export type WeeklyHours = {
  // 0=Sunday ... 6=Saturday
  [weekday: number]: { start: string; end: string }[];
};

export async function getCalendarConfig() {
  let cfg = await prisma.calendarConfig.findUnique({ where: { id: 1 } });
  if (!cfg) {
    const businessHours: WeeklyHours = {
      0: [],
      1: [{ start: "14:00", end: "18:00" }],
      2: [
        { start: "09:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
      3: [{ start: "09:00", end: "13:00" }],
      4: [
        { start: "09:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
      5: [
        { start: "09:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
      6: [{ start: "09:00", end: "17:00" }], // Saturday by appointment only
    };
    cfg = await prisma.calendarConfig.create({
      data: {
        id: 1,
        timezone: "Europe/Paris",
        slotMinutes: 60,
        leadTimeHours: 6,
        maxConcurrent: 1,
        saturdayByAppt: true,
        businessHours: JSON.stringify(businessHours),
      },
    });
  }
  return cfg;
}

export function parseBusinessHours(json: string | null): WeeklyHours {
  if (!json) return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  try {
    return JSON.parse(json);
  } catch {
    return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  }
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isWithinBusinessHours(start: Date, end: Date, hours: WeeklyHours): boolean {
  const s = new Date(start);
  const e = new Date(end);
  if (e <= s) return false;
  const day = s.getDay();
  if (day !== e.getDay()) return false; // simple rule: same-day bookings
  const slots = hours[day] || [];
  if (slots.length === 0) return false;

  const sm = s.getHours() * 60 + s.getMinutes();
  const em = e.getHours() * 60 + e.getMinutes();
  return slots.some((win) => sm >= toMinutes(win.start) && em <= toMinutes(win.end));
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export async function hasBlockConflict(start: Date, end: Date) {
  const blocks = await prisma.calendarBlock.findMany({
    where: {
      OR: [
        { start: { lt: end }, end: { gt: start } },
      ],
    },
    select: { id: true, start: true, end: true },
  });
  return blocks.length > 0;
}

export async function countOverlappingBookings(start: Date, end: Date) {
  const bookings = await prisma.booking.count({
    where: {
      status: { in: ["pending", "confirmed"] },
      start: { lt: end },
      end: { gt: start },
    },
  });
  return bookings;
}

export async function hasEventBlockConflict(start: Date, end: Date) {
  const events = await prisma.calendarEvent.findMany({
    where: {
      blocksAvail: true,
      start: { lt: end },
      end: { gt: start },
      status: { not: "cancelled" },
    },
    select: { id: true },
  });
  return events.length > 0;
}
