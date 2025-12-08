import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Changed from getPrisma
import { compare } from "bcryptjs";
import { rateLimit } from "@/lib/security";
import { generateToken } from "@/lib/jwt";
import { handleApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";

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
  const rl = await rateLimit("auth:login", ip);
  if (!rl.allowed) {
    await jitter(250);
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  // Removed getPrisma() - using direct import

  const body = await req.json().catch(() => ({} as unknown));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || !validEmail(email)) {
    await jitter(250);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  try {
    logger.info('AUTH LOGIN: Login attempt', { email });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || user.active === false) {
      logger.warn('AUTH LOGIN: Invalid credentials', { email });
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    const ok = await compare(password, user.password);
    if (!ok) {
      logger.warn('AUTH LOGIN: Invalid password', { email });
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    // Générer JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email ?? email,
      role: user.role || 'user',
    });

    logger.info('AUTH LOGIN: Login successful', { userId: user.id, email, role: user.role });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email ?? email,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    await jitter(250);
    return handleApiError(error, 'auth/login');
  }
}
