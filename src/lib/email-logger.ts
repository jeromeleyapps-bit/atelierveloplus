/**
 * Email Logger - Traçage de tous les emails envoyés
 * 
 * Enregistre tous les emails envoyés dans la table Communication
 * pour un suivi unifié, quelle que soit la méthode d'envoi (Gmail, SMTP, Resend)
 * 
 * AMÉLIORATION CRITIQUE - 16 novembre 2025
 */

import { prisma } from '@/lib/prisma';
import { getUserIdOrFirst } from './api-helpers';
import { logger } from './logger';

export interface EmailLogData {
  to: string | string[];
  subject: string;
  content?: string;
  html?: string;
  provider?: string; // 'gmail', 'resend', 'smtp', etc.
  messageId?: string;
  customerId?: string;
  workOrderId?: string;
  invoiceId?: string;
  type?: string; // 'invoice', 'reminder', 'receipt', 'communication', etc.
  event?: string; // 'invoice_sent', 'reminder_sent', 'receipt_sent', etc.
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enregistrer un email dans la table Communication
 * 
 * @param data - Données de l'email à logger
 * @param req - Request optionnel pour obtenir userId
 * @returns ID de la communication créée ou null en cas d'erreur
 */
export async function logEmail(
  data: EmailLogData,
  req?: Request
): Promise<string | null> {
  try {
    // Obtenir userId si possible
    let userId: string | null = null;
    if (req) {
      userId = await getUserIdOrFirst(req);
    }

    // Déterminer customerId si pas fourni mais invoiceId/workOrderId fourni
    let customerId = data.customerId;
    if (!customerId) {
      if (data.invoiceId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: data.invoiceId },
          include: { WorkOrder: { include: { Customer: true } } }
        });
        customerId = invoice?.WorkOrder?.customerId || null;
      } else if (data.workOrderId) {
        const workOrder = await prisma.workOrder.findUnique({
          where: { id: data.workOrderId },
          select: { customerId: true }
        });
        customerId = workOrder?.customerId || null;
      }
    }

    // Si pas de customerId, essayer de le trouver via l'email
    if (!customerId && data.to) {
      const email = Array.isArray(data.to) ? data.to[0] : data.to;
      const customer = await prisma.customer.findUnique({
        where: { email },
        select: { id: true }
      });
      customerId = customer?.id || null;
    }

    // Déterminer le provider si pas fourni
    let provider = data.provider || 'unknown';
    if (!data.provider && userId) {
      try {
        const settings = await prisma.systemSettings.findUnique({
          where: { userId },
          select: { emailProvider: true, smtpHost: true }
        });
        if (settings?.emailProvider) {
          provider = settings.emailProvider;
        } else if (settings?.smtpHost) {
          // Détecter provider depuis host
          const host = settings.smtpHost.toLowerCase();
          if (host.includes('gmail')) provider = 'gmail';
          else if (host.includes('outlook') || host.includes('office365')) provider = 'outlook';
          else if (host.includes('yahoo')) provider = 'yahoo';
          else provider = 'smtp';
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[email-logger] Error detecting provider:', { error: errorMessage });
      }
    }

    // Déterminer le type et event si pas fournis
    const type = data.type || 'email';
    const event = data.event || `${type}_sent`;

    // Créer la communication
    // Si pas de customerId, créer un customer temporaire ou utiliser le premier customer
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      try {
        const email = Array.isArray(data.to) ? data.to[0] : data.to;
        if (email && email !== 'unknown' && email.includes('@')) {
          // Essayer de créer un customer temporaire avec l'email
          const tempCustomer = await prisma.customer.upsert({
            where: { email },
            update: {},
            create: {
              email,
              firstName: 'Client',
              lastName: 'Temporaire',
            }
          });
          finalCustomerId = tempCustomer.id;
        } else {
          // Si pas d'email valide, utiliser le premier customer comme fallback
          const firstCustomer = await prisma.customer.findFirst({
            select: { id: true }
          });
          if (!firstCustomer) {
            // Si aucun customer n'existe, créer un customer par défaut
            const defaultCustomer = await prisma.customer.create({
              data: {
                email: 'system@atelier-velo-plus.local',
                firstName: 'Système',
                lastName: 'Atelier Vélo+',
              }
            });
            finalCustomerId = defaultCustomer.id;
          } else {
            finalCustomerId = firstCustomer.id;
          }
        }
      } catch (_error) {
        // Si échec, utiliser le premier customer comme fallback absolu
        const firstCustomer = await prisma.customer.findFirst({
          select: { id: true }
        });
        if (firstCustomer) {
          finalCustomerId = firstCustomer.id;
        } else {
          // Dernier recours : créer un customer système
          try {
            const defaultCustomer = await prisma.customer.create({
              data: {
                email: 'system@atelier-velo-plus.local',
                firstName: 'Système',
                lastName: 'Atelier Vélo+',
              }
            });
            finalCustomerId = defaultCustomer.id;
          } catch (createError) {
            // Si même ça échoue, on ne peut pas logger l'email
            logger.error('[email-logger] Impossible de créer customer pour logging:', createError);
            return null;
          }
        }
      }
    }

    const communication = await prisma.communication.create({
      data: {
        customerId: finalCustomerId,
        workOrderId: data.workOrderId || null,
        invoiceId: data.invoiceId || null,
        type,
        event,
        recipient: Array.isArray(data.to) ? data.to.join(', ') : data.to,
        subject: data.subject || '(Sans objet)',
        content: data.content || data.html || '',
        status: data.error ? 'failed' : 'sent',
        provider,
        externalId: data.messageId || null,
        sentAt: data.error ? null : new Date(),
        deliveredAt: null, // Sera mis à jour si on reçoit une confirmation
        error: data.error || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      }
    });

    logger.info(`[email-logger] Email logged: ${communication.id} (${provider}, ${type})`);
    return communication.id;
  } catch (error: unknown) {
    // Ne pas faire échouer l'envoi d'email si le logging échoue
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[email-logger] Error logging email:', { error: errorMessage });
    return null;
  }
}

/**
 * Mettre à jour le statut d'un email (ex: delivered, failed)
 * 
 * @param communicationId - ID de la communication
 * @param status - Nouveau statut ('sent', 'delivered', 'failed')
 * @param deliveredAt - Date de livraison si applicable
 */
export async function updateEmailStatus(
  communicationId: string,
  status: 'sent' | 'delivered' | 'failed',
  deliveredAt?: Date
): Promise<void> {
  try {
    await prisma.communication.update({
      where: { id: communicationId },
      data: {
        status,
        deliveredAt: deliveredAt || (status === 'delivered' ? new Date() : null),
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[email-logger] Error updating email status:', { error: errorMessage });
  }
}

