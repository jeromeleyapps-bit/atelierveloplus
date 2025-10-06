import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

function getSmtp() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = /^true$/i.test(process.env.SMTP_SECURE || "false");
  if (!host || !user || !pass) return null;
  return { host, port, secure, auth: { user, pass } } as const;
}

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

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const prisma = await getPrisma();
    if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    const smtp = getSmtp();
    if (!smtp) return NextResponse.json({ error: 'smtp_not_configured' }, { status: 501 });

    const inv = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (inv.status !== 'issued') return NextResponse.json({ error: 'invalid_status', detail: 'only issued invoices can be reminded' }, { status: 400 });

    let customer: any = null;
    if (inv.workOrderId) {
      const wo = await prisma.workOrder.findUnique({ where: { id: inv.workOrderId } });
      if (wo?.customerId) customer = await prisma.customer.findUnique({ where: { id: wo.customerId } });
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

    const transporter = nodemailer.createTransport(smtp as any);
    const filename = `relance_${inv.number || inv.id}.pdf`;
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || smtp.auth.user,
      to,
      subject: `Relance — Facture ${inv.number || inv.id}`,
      text: `Bonjour,\n\nMerci de procéder au paiement de la facture ${inv.number || inv.id}.\nMontant dû TTC: ${inv.totalTTC?.toFixed(2)} ${inv.currency}.\n\nCordialement,\n${shopName}`,
      attachments: [ { filename, content: Buffer.from(bytes), contentType: 'application/pdf' } ],
    });

    await prisma.invoice.update({ where: { id: inv.id }, data: { reminderCount: (inv.reminderCount || 0) + 1, lastReminderAt: new Date() } });

    return NextResponse.json({ ok: true, messageId: info.messageId }, { status: 200 });
  } catch (e: any) {
    console.error('invoice_remind_error', e);
    return NextResponse.json({ error: 'remind_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
