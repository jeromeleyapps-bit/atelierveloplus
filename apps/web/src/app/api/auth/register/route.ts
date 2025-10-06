import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { rateLimit, validatePasswordComplexity, isPasswordBreached } from "@/lib/security";
import { wipeAllApplicationData } from "@/lib/dbReset";

function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return 'local';
}

function validEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function jitter(ms = 200) { return new Promise((r) => setTimeout(r, ms)); }

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit("auth:register", ip, 5, 60);
  if (!rl.allowed) {
    await jitter(250);
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const body = await req.json().catch(() => ({} as any));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName : undefined;
  const lastName = typeof body.lastName === 'string' ? body.lastName : undefined;
  const shopName = typeof body.shopName === 'string' ? body.shopName : undefined;
  const isAutoEntrepreneur = !!body.isAutoEntrepreneur;

  if (!email || !password) {
    await jitter(250);
    return NextResponse.json({ error: "invalid_credentials", ...(process.env.NODE_ENV === 'development' ? { reason: 'missing_fields' } : {}) }, { status: 400 });
  }
  if (!validEmail(email)) {
    await jitter(250);
    return NextResponse.json({ error: "invalid_credentials", ...(process.env.NODE_ENV === 'development' ? { reason: 'invalid_email' } : {}) }, { status: 400 });
  }
  if (!validatePasswordComplexity(password)) {
    await jitter(250);
    return NextResponse.json({ error: "invalid_credentials", ...(process.env.NODE_ENV === 'development' ? { reason: 'weak_password' } : {}) }, { status: 400 });
  }

  // Optional breach check; block if found
  try {
    const breached = await isPasswordBreached(password);
    if (breached) {
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials", ...(process.env.NODE_ENV === 'development' ? { reason: 'breached_password' } : {}) }, { status: 400 });
    }
  } catch {
    // Network errors ignored to avoid register outage
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await jitter(250);
      return NextResponse.json({ error: "register_failed" }, { status: 400 });
    }
    // Optionally reset database before creating the first user
    const shouldReset = process.env.RESET_DB_ON_REGISTER === "true" || process.env.NODE_ENV === "development";
    if (shouldReset) {
      try {
        await wipeAllApplicationData();
      } catch {
        // ignore wipe errors, proceed with user creation
      }
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: [firstName, lastName].filter(Boolean).join(" ") || null,
        role: "user",
        active: true,
      },
    });

    // Optionally set any app-level settings for this user
    if (shopName) {
      await prisma.appSetting.create({ data: { userId: user.id, shopName } });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email ?? email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      shopName: shopName ?? null,
      isAutoEntrepreneur,
    }, { status: 201 });
  } catch (e: any) {
    await jitter(250);
    return NextResponse.json({ error: "register_failed" }, { status: 500 });
  }
}
