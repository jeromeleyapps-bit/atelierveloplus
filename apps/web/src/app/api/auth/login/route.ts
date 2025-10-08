import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { rateLimit } from "@/lib/security";
import { generateToken } from "@/lib/jwt";

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
  const rl = await rateLimit("auth:login", ip, 10, 60);
  if (!rl.allowed) {
    await jitter(250);
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const body = await req.json().catch(() => ({} as any));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || !validEmail(email)) {
    await jitter(250);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || user.active === false) {
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    const ok = await compare(password, user.password);
    if (!ok) {
      await jitter(250);
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    // Générer JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email ?? email,
      role: user.role || 'user',
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email ?? email,
        role: user.role || 'user',
      },
    });
  } catch (e: any) {
    await jitter(250);
    return NextResponse.json({ error: "login_failed" }, { status: 500 });
  }
}
