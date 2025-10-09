import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getUserFromToken } from "@/lib/jwt";

export const dynamic = 'force-dynamic';

// Récupérer les paramètres système
export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    const user = await getUserFromToken(req);
    let userId = user?.userId;
    
    // Fallback: utiliser le premier utilisateur
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    }

    // Récupérer ou créer les paramètres système
    let settings = await prisma.systemSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Créer des paramètres par défaut
      settings = await prisma.systemSettings.create({
        data: {
          userId,
          notificationsEnabled: true,
          emailNotificationsEnabled: true,
          activityLogsEnabled: true,
          autoBackupEnabled: false,
          backupFrequency: 'weekly',
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// Mettre à jour les paramètres système
export async function PUT(req: NextRequest) {
  try {
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    const user = await getUserFromToken(req);
    let userId = user?.userId;
    
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) userId = firstUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      notificationsEnabled,
      emailNotificationsEnabled,
      activityLogsEnabled,
      autoBackupEnabled,
      backupFrequency,
    } = body;

    const settings = await prisma.systemSettings.upsert({
      where: { userId },
      update: {
        notificationsEnabled,
        emailNotificationsEnabled,
        activityLogsEnabled,
        autoBackupEnabled,
        backupFrequency,
      },
      create: {
        userId,
        notificationsEnabled: notificationsEnabled ?? true,
        emailNotificationsEnabled: emailNotificationsEnabled ?? true,
        activityLogsEnabled: activityLogsEnabled ?? true,
        autoBackupEnabled: autoBackupEnabled ?? false,
        backupFrequency: backupFrequency ?? 'weekly',
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
