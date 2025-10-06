import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";

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

async function buildInvoicePdf(inv: any) {
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const prisma = await getPrisma();
    if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    const smtp = getSmtp();
    if (!smtp) return NextResponse.json({ error: 'smtp_not_configured' }, { status: 501 });

    const inv = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { lines: true } as any,
    } as any);
    if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Enrich with customer via WorkOrder
    let customer: any = null;
    if (inv.workOrderId) {
      const wo = await prisma.workOrder.findUnique({ where: { id: inv.workOrderId } });
      if (wo?.customerId) customer = await prisma.customer.findUnique({ where: { id: wo.customerId } });
    }
    const enriched = { ...inv, customer } as any;

    const bytes = await buildInvoicePdf(enriched);
    const filename = `facture_${inv.number || inv.id}.pdf`;

    const to = customer?.email;
    if (!to) return NextResponse.json({ error: 'customer_email_missing' }, { status: 400 });

    const transporter = nodemailer.createTransport(smtp as any);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || (smtp as any).auth.user,
      to,
      subject: `Votre facture ${inv.number || inv.id}`,
      text: `Bonjour,\n\nVeuillez trouver votre facture en pièce jointe.\n\nCordialement,\nAtelier velo +`,
      attachments: [
        { filename, content: Buffer.from(bytes), contentType: 'application/pdf' },
      ],
    });

    return NextResponse.json({ ok: true, messageId: info.messageId }, { status: 200 });
  } catch (e: any) {
    console.error('invoice_email_error', e);
    return NextResponse.json({ error: 'email_send_failed', detail: String(e?.message || e) }, { status: 500 });
  }
}
