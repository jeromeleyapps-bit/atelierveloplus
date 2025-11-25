import nodemailer from "nodemailer";
import { getPrisma } from "./db";
import { logEmail } from "./email-logger";
import { logger } from "./logger";

export type MailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  userId?: string; // Optionnel: pour charger config depuis DB
};

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Récupère la configuration SMTP
 * Priorité: 1. DB (SystemSettings) si userId fourni, 2. process.env
 * 
 * EXPORTÉ pour utilisation dans routes API (AMÉLIORATION CRITIQUE - 16 nov 2025)
 */
export async function getSmtpConfig(userId?: string): Promise<SmtpConfig | null> {
  // 1. Essayer depuis DB si userId fourni
  if (userId) {
    try {
      const prisma = await getPrisma();
      if (prisma) {
        const settings = await prisma.systemSettings.findUnique({
          where: { userId },
          select: {
            smtpHost: true,
            smtpPort: true,
            smtpSecure: true,
            smtpUser: true,
            smtpPass: true,
            emailFromAddress: true,
          }
        });

        if (settings?.smtpHost && settings.smtpUser && settings.smtpPass) {
          logger.info('[mailer] Using SMTP config from DB for user:', userId);
          return {
            host: settings.smtpHost,
            port: settings.smtpPort || 587,
            secure: settings.smtpSecure || false,
            user: settings.smtpUser,
            pass: settings.smtpPass,
            from: settings.emailFromAddress || process.env.FROM_EMAIL || process.env.SHOP_EMAIL || "no-reply@localhost"
          };
        }
      }
    } catch (error) {
      logger.error('[mailer] Error loading SMTP config from DB:', error);
      // Continue to fallback
    }
  }

  // 2. Fallback sur process.env
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  if (host && port && user && pass) {
    logger.info('[mailer] Using SMTP config from process.env');
    return {
      host,
      port,
      secure,
      user,
      pass,
      from: process.env.FROM_EMAIL || process.env.SHOP_EMAIL || "no-reply@localhost"
    };
  }

  return null; // No SMTP configured
}

/**
 * Créer un transporter nodemailer depuis une config
 */
function createTransporter(config: SmtpConfig): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    tls: {
      rejectUnauthorized: false // Pour éviter les erreurs de certificat
    }
  });
}

/**
 * Envoyer un email
 * Utilise la config DB si userId fourni, sinon fallback sur process.env
 */
export default async function sendMail({ to, subject, text, html, userId }: MailInput) {
  const config = await getSmtpConfig(userId);
  
  if (!config) {
    logger.info("[mailer] SMTP not configured. Email would be sent:", { to, subject, text });
    return { queued: false, reason: "smtp_not_configured" };
  }

  const transporter = createTransporter(config);
  const info = await transporter.sendMail({ 
    from: config.from, 
    to, 
    subject, 
    text, 
    html 
  });
  
  logger.info('[mailer] Email sent:', { messageId: info.messageId, to });
  
  // ✅ TRACING: Enregistrer l'email dans Communication
  try {
    await logEmail({
      to,
      subject,
      content: text,
      html,
      provider: 'smtp', // mailer.ts utilise toujours SMTP
      messageId: info.messageId,
      type: 'email',
      event: 'email_sent',
    });
  } catch (logError) {
    // Ne pas faire échouer l'envoi si le logging échoue
    logger.error('[mailer] Error logging email:', logError);
  }
  
  return { queued: true, messageId: info.messageId };
}
