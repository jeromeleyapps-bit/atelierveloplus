import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-with-db-config";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

interface DiagnosticsPayload {
  filename: string;
  contentBase64: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DiagnosticsPayload;
    const { filename, contentBase64 } = body;

    if (!filename || !contentBase64) {
      return NextResponse.json(
        { error: "missing_fields", message: "filename and contentBase64 are required" },
        { status: 400 }
      );
    }

    const supportEmail = process.env.SUPPORT_EMAIL || "jeromeley.apps@gmail.com";

    // Récupérer quelques informations atelier pour le contexte
    let shopName = "Atelier Vélo+";
    let shopEmail: string | undefined;

    try {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
      });

      if (firstUser) {
        const appSettings = await prisma.appSetting.findUnique({
          where: { userId: firstUser.id },
        });
        if (appSettings) {
          shopName = appSettings.shopName || shopName;
          shopEmail = appSettings.shopEmail || undefined;
        }
      }
    } catch (e) {
      logger.error("[DIAG] Erreur lecture AppSettings:", e);
    }

    const subject = `Diagnostics Atelier Vélo+ - ${shopName}`;

    const htmlParts: string[] = [];
    htmlParts.push(`<p>Un fichier de diagnostics a été généré depuis l'application Atelier Vélo+.</p>`);
    htmlParts.push(`<p><strong>Boutique :</strong> ${shopName}</p>`);
    if (shopEmail) {
      htmlParts.push(`<p><strong>Email atelier :</strong> ${shopEmail}</p>`);
    }
    htmlParts.push(`<p>Le fichier ZIP contenant les journaux est joint à cet email.</p>`);

    const html = htmlParts.join("\n");

    const buffer = Buffer.from(contentBase64, "base64");

    await sendEmail({
      to: supportEmail,
      subject,
      html,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[DIAG] Envoi diagnostics email error:", message);
    return NextResponse.json(
      { error: "send_failed", message },
      { status: 500 }
    );
  }
}
