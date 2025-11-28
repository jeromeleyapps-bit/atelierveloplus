import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/recent-emails
 * Récupère les derniers emails envoyés depuis la table Communication
 * 
 * AMÉLIORATION CRITIQUE - 16 novembre 2025
 * Supporte maintenant tous les providers (Gmail, SMTP, Resend)
 */
export async function GET() {
  try {
    // Récupérer les 10 derniers emails depuis Communication
    // Filtrer uniquement les emails (type = 'email', 'invoice', 'reminder', 'receipt', 'communication')
    const communications = await prisma.communication.findMany({
      where: {
        type: {
          in: ['email', 'invoice', 'reminder', 'receipt', 'communication']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        recipient: true,
        subject: true,
        status: true,
        provider: true,
        sentAt: true,
        createdAt: true,
        deliveredAt: true,
        error: true,
        type: true,
        event: true,
      }
    });

    // Formater les données pour l'affichage (compatibilité avec l'ancien format Resend)
    const emails = communications.map((comm) => ({
      id: comm.id,
      to: comm.recipient,
      subject: comm.subject || '(Sans objet)',
      status: comm.status === 'delivered' ? 'delivered' : 
              comm.status === 'failed' ? 'failed' : 
              comm.status === 'sent' ? 'sent' : 'pending',
      provider: comm.provider || 'unknown',
      type: comm.type,
      event: comm.event,
      createdAt: comm.sentAt || comm.createdAt,
      deliveredAt: comm.deliveredAt,
      error: comm.error,
    }));

    return NextResponse.json({ 
      emails,
      total: communications.length,
      message: communications.length === 0 
        ? "Aucun email envoyé récemment" 
        : `${communications.length} email(s) trouvé(s)`
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    logger.error("Error fetching recent emails:", { error: message });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
