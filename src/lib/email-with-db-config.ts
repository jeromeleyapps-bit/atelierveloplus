/**
 * Email module - Avec support config DB
 * Priorité: Config SMTP DB > Variables ENV
 */

import { prisma } from '@/lib/prisma';
import { logEmail } from '@/lib/email-logger';
import { logger } from '@/lib/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
  }>;
}

/**
 * Déterminer le provider email utilisé
 * Retourne: 'gmail' | 'resend' | 'smtp' selon config
 */
export async function determineEmailProvider(): Promise<string> {
  // 1. Config DB en priorité
  const dbConfig = await getSmtpConfigFromDB();
  if (dbConfig) {
    // Détecter provider depuis host
    if (dbConfig.host.includes('gmail')) return 'gmail';
    if (dbConfig.host.includes('outlook') || dbConfig.host.includes('office365')) return 'outlook';
    if (dbConfig.host.includes('yahoo')) return 'yahoo';
    return 'smtp'; // Generic SMTP
  }

  // 2. Fallback .env
  const envProvider = (process.env.MAIL_PROVIDER || '').toLowerCase();
  if (envProvider === 'gmail') return 'gmail';

  // 3. Détecter depuis SMTP_HOST
  const smtpHost = (process.env.SMTP_HOST || '').toLowerCase();
  if (smtpHost.includes('gmail')) return 'gmail';
  if (smtpHost.includes('outlook')) return 'outlook';
  
  return 'unknown';
}

/**
 * Charger config SMTP depuis DB
 * Retourne null si pas configuré
 */
async function getSmtpConfigFromDB() {
  try {
    const firstUser = await prisma.user.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!firstUser) return null;

    const settings = await prisma.systemSettings.findUnique({
      where: { userId: firstUser.id },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUser: true,
        smtpPass: true,
        emailFromAddress: true,
        emailFromName: true,
      }
    });

    // Valider que config est complète
    if (settings && settings.smtpHost && settings.smtpUser && settings.smtpPass) {
      return {
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: settings.smtpSecure || false,
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.emailFromAddress || settings.smtpUser,
      };
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[SMTP] Erreur lecture config DB', { error: errorMessage });
    return null;
  }
}

/**
 * Send email using DB config or ENV fallback
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // 1. Essayer config SMTP depuis DB (priorité)
  const dbConfig = await getSmtpConfigFromDB();
  
  if (dbConfig) {
    logger.info('📧 Utilisation config SMTP depuis DB', { host: dbConfig.host });
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: dbConfig.host,
      port: dbConfig.port,
      secure: dbConfig.secure,
      auth: {
        user: dbConfig.user,
        pass: dbConfig.pass,
      },
      debug: true, // Enable debug logs
      logger: true, // Enable logger
    });

    const attachments = (options.attachments || []).map(att => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
      contentType: att.contentType,
    }));

    const info = await transport.sendMail({
      from: dbConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    
    logger.info('✅ Email envoyé via SMTP DB - ID', { messageId: info.messageId });
    
    // ✅ TRACING: Enregistrer l'email dans Communication
    try {
      const provider = dbConfig.host.includes('gmail') ? 'gmail' : 
                      dbConfig.host.includes('outlook') || dbConfig.host.includes('office365') ? 'outlook' :
                      dbConfig.host.includes('yahoo') ? 'yahoo' : 'smtp';
      
      await logEmail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        provider,
        messageId: info.messageId,
        type: 'email',
        event: 'email_sent',
        metadata: { 
          attachments: attachments.length > 0 ? attachments.map(a => a.filename) : [],
          host: dbConfig.host 
        },
      });
    } catch (logError) {
      const errorMessage = logError instanceof Error ? logError.message : String(logError);
      logger.error('[email-with-db-config] Error logging email', { error: errorMessage });
    }
    
    return;
  }

  // 2. Fallback Gmail via ENV
  const provider = (process.env.MAIL_PROVIDER || '').toLowerCase();

  if (provider === 'gmail') {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const from = process.env.GMAIL_FROM || user || '';

    if (!user || !pass || !from) {
      throw new Error('Gmail SMTP requires GMAIL_USER, GMAIL_APP_PASSWORD and GMAIL_FROM');
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const attachments = (options.attachments || []).map(att => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
      contentType: att.contentType,
    }));

    logger.info('📧 Envoi email via Gmail ENV à', { to: options.to });
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    logger.info('✅ Email envoyé via Gmail ENV - ID', { messageId: info.messageId });
    
    // ✅ TRACING: Enregistrer l'email dans Communication
    try {
      await logEmail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        provider: 'gmail',
        messageId: info.messageId,
        type: 'email',
        event: 'email_sent',
        metadata: { 
          attachments: attachments.length > 0 ? attachments.map(a => a.filename) : [],
          source: 'env' 
        },
      });
    } catch (logError) {
      const errorMessage = logError instanceof Error ? logError.message : String(logError);
      logger.error('[email-with-db-config] Error logging email', { error: errorMessage });
    }
    
    return;
  }

  // 3. Aucune config trouvée.
  // Note (Sprint 5) : le fallback Resend a été retiré de l'app Electron. Chaque atelier
  // configure son propre SMTP via Paramètres → Configuration Email. Resend n'est plus
  // utilisé que côté Worker Cloudflare (envoi des codes d'activation de licence par l'éditeur).
  throw new Error(
    "Aucune configuration email trouvée. Configurez votre SMTP dans Paramètres → Configuration Email (SMTP)."
  );
}

/**
 * Generate invoice/quote/credit email HTML
 */
export function generateInvoiceEmailHTML(data: {
  customerName: string;
  invoiceNumber: string;
  totalTTC: number;
  shopName: string;
  dueDate?: string | null;
  documentType?: 'invoice' | 'quote' | 'credit';
}): string {
  // Adapter le contenu selon le type de document
  const docType = data.documentType || 'invoice';
  const docLabel = docType === 'quote' ? 'devis' : docType === 'credit' ? 'avoir' : 'facture';
  const docLabelCap = docType === 'quote' ? 'Devis' : docType === 'credit' ? 'Avoir' : 'Facture';
  const docTitle = docType === 'quote' ? 'Votre devis est prêt' : 
                   docType === 'credit' ? 'Votre avoir est prêt' : 
                   'Votre facture est prête';
  const docMessage = docType === 'quote' ? 
    'Merci pour votre intérêt ! Vous trouverez ci-joint votre devis détaillé.' :
    docType === 'credit' ?
    'Vous trouverez ci-joint votre avoir.' :
    'Merci pour votre confiance ! Vous trouverez ci-joint votre facture.';
  
  const dueDateText = data.dueDate 
    ? `<p style="margin: 10px 0 0 0;"><strong>Date d'échéance :</strong> ${new Date(data.dueDate).toLocaleDateString('fr-FR')}</p>`
    : '';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docLabelCap} ${data.invoiceNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${data.shopName}</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
    <h2 style="color: #1976d2; margin-top: 0;">${docTitle}</h2>
    
    <p>Bonjour ${data.customerName},</p>
    
    <p>${docMessage}</p>
    
    <div style="background-color: white; padding: 20px; border-left: 4px solid #1976d2; margin: 20px 0;">
      <p style="margin: 0;"><strong>Numéro de ${docLabel} :</strong> ${data.invoiceNumber}</p>
      <p style="margin: 10px 0 0 0;"><strong>Montant total TTC :</strong> ${data.totalTTC.toFixed(2)} €</p>
      ${dueDateText}
    </div>
    
    <p>Le PDF de votre ${docLabel} est joint à cet email.</p>
    
    <p>Pour toute question, n'hésitez pas à nous contacter.</p>
    
    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>${data.shopName}</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
  </div>
</body>
</html>
  `.trim();
}
