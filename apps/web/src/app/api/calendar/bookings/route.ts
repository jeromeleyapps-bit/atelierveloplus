import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { z } from "zod";
import { sendEmail } from "../../../../lib/hubspot";
import { generateBookingConfirmationHTML, generateBookingNotificationHTML } from "../../../../lib/email-templates";
import {
  getCalendarConfig,
  parseBusinessHours,
  isWithinBusinessHours,
  hasBlockConflict,
  hasEventBlockConflict,
  countOverlappingBookings,
} from "../../../../lib/calendar";

const createSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime().optional(),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    bike: z.string().optional(),
    description: z.string().optional(),
  })
  .refine((d) => !!(d.email || d.phone), {
    message: "Email ou téléphone requis",
    path: ["email"],
  });

function normalizeFRPhone(input?: string | null): string | undefined {
  if (!input) return undefined;
  const digits = (input.match(/\d+/g) || []).join("");
  if (!digits) return undefined;
  // Remove leading zeros/spaces. FR patterns:
  // 0XXXXXXXXX (10 digits) => +33XXXXXXXXX without leading 0
  // 33XXXXXXXXX (11 digits) => +33XXXXXXXXX
  // +33XXXXXXXXX (already ok)
  if (input.trim().startsWith("+")) {
    return input.trim().replace(/\s+/g, "");
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return "+33" + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith("33")) {
    return "+" + digits;
  }
  // Fallback: if 9-12 digits, keep with +33 prefix if plausible
  if (digits.length >= 9 && digits.length <= 12) {
    return "+33" + (digits.startsWith("0") ? digits.slice(1) : digits);
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const where: any = {};
  if (start && end) {
    where.start = { lt: new Date(end) };
    where.end = { gt: new Date(start) };
  }
  const items = await prisma.booking.findMany({ where, orderBy: { start: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const normalizedPhone = normalizeFRPhone(data.phone);
  if (!data.email && !normalizedPhone) {
    return NextResponse.json({ error: "Email ou téléphone FR requis" }, { status: 400 });
  }

  const cfg = await getCalendarConfig();
  const tz = cfg.timezone || "Europe/Paris";
  const slotMin = cfg.slotMinutes || 60;
  const leadH = cfg.leadTimeHours || 6;
  const maxC = cfg.maxConcurrent || 1;
  const hours = parseBusinessHours(cfg.businessHours);

  const start = new Date(data.start);
  const end = data.end ? new Date(data.end) : new Date(new Date(data.start).getTime() + slotMin * 60000);

  if (!(start < end)) return NextResponse.json({ error: "Invalid time range" }, { status: 400 });

  // Lead time
  const now = new Date();
  const soonest = new Date(now.getTime() + leadH * 3600 * 1000);
  if (start < soonest) return NextResponse.json({ error: `Lead time ${leadH}h` }, { status: 400 });

  // Limit booking window to J..J+7
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  if (start > sevenDaysAhead || end > sevenDaysAhead) {
  }

  // Duration must be multiple of slotMin
  const durMin = Math.round((end.getTime() - start.getTime()) / 60000);
  if (durMin % slotMin !== 0) {
    return NextResponse.json({ error: `La durée doit être un multiple de ${slotMin} minutes` }, { status: 400 });
  }

  // Business hours
  if (!isWithinBusinessHours(start, end, hours)) {
    return NextResponse.json({ error: "Outside business hours" }, { status: 400 });
  }

  // Conflicts with blocks or blocking events
  if (await hasBlockConflict(start, end)) return NextResponse.json({ error: "Time is blocked" }, { status: 409 });
  if (await hasEventBlockConflict(start, end)) return NextResponse.json({ error: "Not available (internal event)" }, { status: 409 });

  // Overlaps limit
  const overlapCount = await countOverlappingBookings(start, end);
  if (overlapCount >= maxC) return NextResponse.json({ error: "Slot already booked" }, { status: 409 });

  // Prepare customerId via upsert
  let customerId: string | undefined;
  try {
    const [firstName, ...rest] = data.name.trim().split(/\s+/);
    const lastName = rest.join(" ") || null;
    if (data.email) {
      const c = await prisma.customer.upsert({
        where: { email: data.email },
        update: {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: normalizedPhone || undefined,
        },
        create: {
          email: data.email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: normalizedPhone || undefined,
          notes: data.description ? `Créé via réservation: ${data.description}` : undefined,
        },
      });
      customerId = c.id;
    } else if (normalizedPhone) {
      const existing = await prisma.customer.findFirst({ where: { phone: normalizedPhone } });
      if (existing) {
        const c2 = await prisma.customer.update({
          where: { id: existing.id },
          data: {
            firstName: existing.firstName || firstName || undefined,
            lastName: existing.lastName || lastName || undefined,
          },
        });
        customerId = c2.id;
      } else {
        const c3 = await prisma.customer.create({
          data: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phone: normalizedPhone,
            notes: data.description ? `Créé via réservation: ${data.description}` : undefined,
          },
        });
        customerId = c3.id;
      }
    }

    // Create a CustomerBike if provided
    if (customerId && data.bike && data.bike.trim()) {
      const count = await prisma.customerBike.count({ where: { customerId } });
      const nextIndex = count + 1;
      await prisma.customerBike.create({
        data: {
          customerId,
          index: nextIndex,
          model: data.bike.slice(0, 120),
          notes: data.description ? `Créé via réservation: ${data.description}` : undefined,
        },
      });
    }
  } catch (e) {
    console.error("booking_customer_link_error", e);
  }

  const created = await prisma.booking.create({
    data: {
      start,
      end,
      status: "pending",
      name: data.name,
      email: data.email,
      phone: normalizedPhone,
      bike: data.bike,
      description: data.description,
      customerId,
    },
  });

  // Send confirmation emails via HubSpot (best effort)
  try {
    const shop = await prisma.appSetting.findFirst({ 
      select: { 
        shopEmail: true, 
        shopName: true, 
        shopPhone: true, 
        address1: true, 
        city: true 
      } 
    });
    
    const shopName = shop?.shopName || process.env.SHOP_NAME || "Atelier Vélo+";
    const shopEmail = shop?.shopEmail || process.env.SHOP_EMAIL;
    const shopPhone = shop?.shopPhone || process.env.SHOP_PHONE;
    const shopAddress = shop?.address1 || process.env.SHOP_ADDRESS1;
    const shopCity = shop?.city || process.env.SHOP_CITY;
    
    const emailData = {
      customerName: data.name,
      startDate: start,
      endDate: end,
      bike: data.bike,
      description: data.description,
      shopName,
      shopAddress,
      shopCity,
      shopPhone,
      customerEmail: data.email,
      customerPhone: normalizedPhone,
    };
    
    // Email de confirmation au client
    if (data.email) {
      const customerHTML = generateBookingConfirmationHTML(emailData);
      await sendEmail({
        to: data.email,
        subject: `📅 Confirmation de rendez-vous - ${shopName}`,
        htmlContent: customerHTML,
      });
    }
    
    // Email de notification à l'atelier
    if (shopEmail) {
      const shopHTML = generateBookingNotificationHTML(emailData);
      const dateStr = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const timeStr = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      await sendEmail({
        to: shopEmail,
        subject: `🔔 Nouvelle réservation - ${dateStr} ${timeStr}`,
        htmlContent: shopHTML,
      });
    }
  } catch (e: any) {
    console.error("❌ ERREUR ENVOI EMAIL RDV:", e);
    console.error("Message:", e.message);
    console.error("Details:", e.response?.data || e.stack);
  }

  return NextResponse.json(created, { status: 201 });
}
