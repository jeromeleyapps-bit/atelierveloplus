import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { checkEmailWithPdfLicense, incrementEmailAfterSend } from "@/lib/license-guards";
import { getUserIdOrFirst } from "@/lib/api-helpers";
import { logEmail } from "@/lib/email-logger";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

async function buildReminderPdf(opts: {
  shopName: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 780;
  page.drawText(opts.shopName, { x: 40, y, size: 14, font: fontBold, color: rgb(0.1,0.1,0.1) }); y -= 28;
  page.drawText(`Relance de paiement — Facture ${opts.invoiceNumber}`, { x: 40, y, size: 12, font }); y -= 18;
  page.drawText(`Client: ${opts.customerName}`, { x: 40, y, size: 10, font }); y -= 14;
  if (opts.dueDate) { page.drawText(`Échéance: ${new Date(opts.dueDate).toLocaleDateString()}`, { x: 40, y, size: 10, font }); y -= 14; }
  page.drawText(`Montant dû TTC: ${new Intl.NumberFormat('fr-FR',{ style:'currency', currency: opts.currency||'EUR' }).format(opts.amount || 0)}`, { x: 40, y, size: 11, font }); y -= 20;
  const body = [
    "Bonjour,",
    "",
    "Nous vous remercions de bien vouloir procéder au règlement de la facture ci-dessus mentionnée.",
    "Si le paiement a déjà été effectué, merci d'ignorer ce message.",
    "",
    "Cordialement,",
    opts.shopName,
  ];
  for (const line of body) { page.drawText(line, { x: 40, y, size: 10, font }); y -= 14; }
  return await pdf.save();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ⭐ VÉRIFICATION LICENCE: Limite emails + feature PDF direct send
  const licenseError = await checkEmailWithPdfLicense();
  if (licenseError) return licenseError;

  try {
    // Obtenir userId pour config SMTP depuis DB (AMÉLIORATION CRITIQUE - 16 nov 2025)
    const userId = await getUserIdOrFirst(req);

    // ✅ UTILISER CONFIG SMTP DEPUIS DB (mailer.ts utilise getSmtpConfig(userId))
    // Priorité: 1. DB (SystemSettings) si userId fourni, 2. process.env
    const { getSmtpConfig } = await import('@/lib/mailer');
    const smtpConfig = await getSmtpConfig(userId || undefined);
    if (!smtpConfig) {
      return NextResponse.json({ error: 'smtp_not_configured' }, { status: 501 });
    }

    // ✅ OPTIMISATION: Include relations pour éviter N+1 queries
    // Note: Prisma utilise le nom du modèle (PascalCase) dans include, mais génère camelCase dans les types
    const inv = await prisma.invoice.findUnique({ 
      where: { id: id },
      include: {
        // Include WorkOrder avec Customer en une seule query
        WorkOrder: {
          include: {
            Customer: true
          }
        }
      }
    }) as any;
    if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (inv.status !== 'issued') return NextResponse.json({ error: 'invalid_status', detail: 'only issued invoices can be reminded' }, { status: 400 });

    // ✅ FIX: Récupérer customer via WorkOrder.Customer (inclus) OU customerId direct
    let customer = inv.WorkOrder?.Customer || null;
    
    // Si pas de customer via workOrder mais customerId présent, récupérer directement
    if (!customer && inv.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: inv.customerId }
      });
    }
    
    const to = customer?.email;
    if (!to) return NextResponse.json({ error: 'customer_email_missing' }, { status: 400 });

    const shopName = process.env.SHOP_NAME || 'Atelier velo +';
    const bytes = await buildReminderPdf({
      shopName,
      customerName: [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || customer?.email || customer?.id || 'Client',
      invoiceNumber: inv.number || inv.id,
      amount: inv.totalTTC || 0,
      currency: inv.currency || 'EUR',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
    });

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      tls: { rejectUnauthorized: false }
    });

    const filename = `relance_${inv.number || inv.id}.pdf`;
    const subject = `Relance — Facture ${inv.number || inv.id}`;
    const text = `Bonjour,\n\nMerci de procéder au paiement de la facture ${inv.number || inv.id}.\nMontant dû TTC: ${inv.totalTTC?.toFixed(2)} ${inv.currency}.\n\nCordialement,\n${shopName}`;
    
    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      text,
      attachments: [ { filename, content: Buffer.from(bytes), contentType: 'application/pdf' } ],
    });

    await prisma.invoice.update({ where: { id: inv.id }, data: { reminderCount: (inv.reminderCount || 0) + 1, lastReminderAt: new Date() } });

    // ✅ TRACING: Enregistrer l'email dans Communication
    await logEmail({
      to,
      subject,
      content: text,
      provider: smtpConfig.host.includes('gmail') ? 'gmail' : 'smtp',
      messageId: info.messageId,
      customerId: customer?.id,
      invoiceId: inv.id,
      workOrderId: inv.workOrderId || undefined,
      type: 'reminder',
      event: 'reminder_sent',
      metadata: { invoiceNumber: inv.number, filename, reminderCount: (inv.reminderCount || 0) + 1 },
    }, req);

    // ⭐ Incrémenter compteur emails après envoi réussi
    await incrementEmailAfterSend();

    return NextResponse.json({ ok: true, messageId: info.messageId }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('invoice_remind_error', message);
    return NextResponse.json({ error: 'remind_failed', detail: message }, { status: 500 });
  }
}
