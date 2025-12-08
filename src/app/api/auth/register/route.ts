import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Changed from getPrisma
import { hash } from "bcryptjs";
import { rateLimit, validatePasswordComplexity, isPasswordBreached } from "@/lib/security";
import { wipeAllApplicationData } from "@/lib/dbReset";
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
  const rl = await rateLimit("auth:register", ip);
  if (!rl.allowed) {
    await jitter(250);
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  // Removed getPrisma() - using direct import

  const body = await req.json().catch(() => ({} as unknown));
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
    logger.info('AUTH REGISTER: Registration attempt', { email, shopName });
    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      logger.warn('AUTH REGISTER: Email already exists', { email });
      await jitter(250);
      return NextResponse.json({ error: "email_already_exists", message: "Un compte existe déjà avec cet email" }, { status: 400 });
    }
    // Optionally reset database before creating the first user
    // ⚠️ DÉSACTIVÉ PAR DÉFAUT POUR SÉCURITÉ - Activer uniquement si nécessaire
    const shouldReset = process.env.RESET_DB_ON_REGISTER === "true";
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
        name: firstName && lastName ? [firstName, lastName].filter(Boolean).join(" ") : null,
        role: "admin",  // Tous les utilisateurs sont admin (petit atelier, 1-2 personnes max)
        active: true,
      },
    });

    // Persist app-level settings for this user (optionnel - sera complété dans wizard)
    await prisma.appSetting.upsert({
      where: { userId: user.id },
      create: { userId: user.id, shopName: shopName ?? null, isAutoEntrepreneur: isAutoEntrepreneur ?? false },
      update: { shopName: shopName ?? null, isAutoEntrepreneur: isAutoEntrepreneur ?? false },
    });

    // Create SystemSettings for this user (fixes persistence issue)
    await prisma.systemSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        activityLogsEnabled: true,
        autoBackupEnabled: false,
        backupFrequency: 'weekly',
        emailProvider: 'resend',
        requireAdmin2FA: false,
        hardDeleteEnabled: false,
        maintenanceMode: false,
        securityAlertsEnabled: true,
        tunnelConfigured: false,
      },
      update: {}, // Ne rien changer si existe déjà
    });

    // If auto-entrepreneur, set default VAT to 0% for this environment
    if (isAutoEntrepreneur) {
      try {
        await prisma.globalSetting.upsert({
          where: { key: 'pricing.defaultVatRate' },
          create: { key: 'pricing.defaultVatRate', value: '0' },
          update: { value: '0' },
        });
      } catch {}
    }

    // Générer JWT token pour auto-login
    const token = await generateToken({
      userId: user.id,
      email: user.email ?? email,
      role: user.role || 'user',
    });

    logger.info('AUTH REGISTER: Registration successful', { userId: user.id, email, shopName, isAutoEntrepreneur });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email ?? email,
        role: user.role,
        shopName: shopName ?? null,
      },
      isAutoEntrepreneur,
    }, { status: 201 });
  } catch (error) {
    await jitter(250);
    return handleApiError(error, 'auth/register');
  }
}
