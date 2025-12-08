import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";
import { checkEmailWithPdfLicense, incrementEmailAfterSend } from "@/lib/license-guards";
import { getUserIdOrFirst } from "@/lib/api-helpers";
import { logEmail } from "@/lib/email-logger";
import { Prisma } from "@prisma/client";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// Types pour Invoice avec relations
type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: { 
    InvoiceLine: true;
    WorkOrder: {
      include: {
        Customer: true;
      };
    };
  };
}>;

interface InvoiceForPdf {
  id: string;
  number: string | null;
  issueDate: Date | null;
  createdAt: Date;
  currency: string;
  pricingMode: string;
  subtotalHT: number;
  vatAmount: number;
  totalTTC: number;
  workOrderId: string | null;
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  lines?: Array<{
    description: string;
    qty: number;
    unitPriceHT: number | null;
    unitPriceTTC: number | null;
    totalHT: number;
    totalTTC: number;
  }>;
}

async function buildInvoicePdf(inv: InvoiceForPdf) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const title = `Facture ${inv.number || inv.id}`;
  const shop = `Atelier velo +`;
  const issued = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString();

  let y = 800;
  page.drawText(shop, { x: 40, y, size: 16, font, color: rgb(0.1, 0.1, 0.1) }); y -= 28;
  page.drawText(title, { x: 40, y, size: 14, font }); y -= 18;
  page.drawText(`Date: ${issued}`, { x: 40, y, size: 10, font }); y -= 14;
  if (inv.customer) {
    const name = [inv.customer.firstName, inv.customer.lastName].filter(Boolean).join(' ') || inv.customer.email || inv.customer.id;
    page.drawText(`Client: ${name}`, { x: 40, y, size: 10, font }); y -= 14;
  }
  y -= 10;

  // table header
  page.drawText("Description", { x: 40, y, size: 10, font });
  page.drawText("Qté", { x: width - 200, y, size: 10, font });
  page.drawText("PU", { x: width - 150, y, size: 10, font });
  page.drawText("Total", { x: width - 90, y, size: 10, font }); y -= 12;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.7,0.7,0.7)}); y -= 8;

  const fmt = (n: number | null | undefined) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: inv.currency || 'EUR' }).format(n || 0);

  for (const ln of inv.lines || []) {
    const desc = `${ln.description}`;
    page.drawText(desc.slice(0,80), { x: 40, y, size: 10, font });
    page.drawText(String(ln.qty), { x: width - 200, y, size: 10, font });
    const unit = (inv.pricingMode === 'AE_TTC') ? ln.unitPriceTTC : ln.unitPriceHT;
    page.drawText(fmt(unit || 0), { x: width - 150, y, size: 10, font });
    page.drawText(fmt(ln.totalTTC ?? ln.totalHT ?? 0), { x: width - 90, y, size: 10, font });
    y -= 14;
    if (y < 120) { y = 800; }
  }

  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.7,0.7,0.7)}); y -= 10;
  page.drawText(`Total TTC: ${fmt(inv.totalTTC)}`, { x: width - 200, y, size: 12, font }); y -= 16;
  if (inv.pricingMode !== 'AE_TTC') {
    page.drawText(`Total HT: ${fmt(inv.subtotalHT)}  TVA: ${fmt(inv.vatAmount)}`, { x: width - 260, y, size: 10, font });
  }

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

    // ✅ OPTIMISATION: Include relations pour éviter N+1 queries
    // Note: Prisma utilise le nom du modèle (PascalCase) dans include, mais génère camelCase dans les types
    const inv = await prisma.invoice.findUnique({
      where: { id: id },
      include: { 
        InvoiceLine: true,
        // Include WorkOrder avec Customer en une seule query
        WorkOrder: {
          include: {
            Customer: true
          }
        }
      },
    }) as InvoiceWithRelations | null;
    if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // ✅ FIX: Récupérer customer via WorkOrder.Customer (inclus) OU customerId direct
    let customer = inv.WorkOrder?.Customer || null;
    
    // Si pas de customer via workOrder mais customerId présent, récupérer directement
    if (!customer && inv.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: inv.customerId }
      });
    }
    
    const enriched: InvoiceForPdf = { 
      ...inv, 
      customer,
      lines: inv.InvoiceLine.map(l => ({
        description: l.description,
        qty: l.qty,
        unitPriceHT: l.unitPriceHT,
        unitPriceTTC: l.unitPriceTTC,
        totalHT: l.totalHT,
        totalTTC: l.totalTTC,
      }))
    };

    const bytes = await buildInvoicePdf(enriched);
    const filename = `facture_${inv.number || inv.id}.pdf`;

    const to = customer?.email;
    if (!to) return NextResponse.json({ error: 'customer_email_missing' }, { status: 400 });

    // ✅ UTILISER CONFIG SMTP DEPUIS DB (mailer.ts utilise getSmtpConfig(userId))
    // Priorité: 1. DB (SystemSettings) si userId fourni, 2. process.env
    // NOTE: Utiliser getSmtpConfig() directement car sendMail() ne supporte pas encore les attachments
    // TODO: Ajouter support attachments dans mailer.ts
    const { getSmtpConfig } = await import('@/lib/mailer');
    const smtpConfig = await getSmtpConfig(userId || undefined);
    if (!smtpConfig) {
      return NextResponse.json({ error: 'smtp_not_configured' }, { status: 501 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      tls: { rejectUnauthorized: false }
    });

    const subject = `Votre facture ${inv.number || inv.id}`;
    const text = `Bonjour,\n\nVeuillez trouver votre facture en pièce jointe.\n\nCordialement,\nAtelier velo +`;
    
    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      text,
      attachments: [
        { filename, content: Buffer.from(bytes), contentType: 'application/pdf' },
      ],
    });

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
      type: 'invoice',
      event: 'invoice_sent',
      metadata: { invoiceNumber: inv.number, filename },
    }, req);

    // ⭐ Incrémenter compteur emails après envoi réussi
    await incrementEmailAfterSend();

    return NextResponse.json({ ok: true, messageId: info.messageId }, { status: 200 });
  } catch (e) {
    logger.error('invoice_email_error', e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'email_send_failed', detail }, { status: 500 });
  }
}
