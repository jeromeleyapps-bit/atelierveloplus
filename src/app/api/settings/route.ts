import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * POST /api/settings
 * Permet de créer/mettre à jour un setting global
 * Format body: { key: string, value: string }
 * 
 * Utilisé par: OnboardingWizard
 */
export async function POST(req: Request) {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    const body = await req.json().catch(() => ({}));
    const { key, value } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: "missing_key", message: "Key is required" },
        { status: 400 }
      );
    }

    // Upsert le setting
    const setting = await prisma.globalSetting.upsert({
      where: { key },
      update: { value: value ?? null },
      create: { key, value: value ?? null },
    });

    return NextResponse.json({ key: setting.key, value: setting.value }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    logger.error("[POST /api/settings] Error:", message);
    return NextResponse.json(
      { error: "internal_error", message },
      { status: 500 }
    );
  }
}
