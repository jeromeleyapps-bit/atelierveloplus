import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getUserIdOrFirst } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Espèces', card: 'Carte bancaire', transfer: 'Virement', other: 'Autre',
};

/** GET → reçu d'acompte en PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { depositId } = await params;
  try {
    const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
    if (!deposit) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const userId = await getUserIdOrFirst(req);
    const settings = userId ? await prisma.appSetting.findUnique({ where: { userId } }) : null;
    const shopName = settings?.shopName || process.env.SHOP_NAME || 'Atelier Vélo+';

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

    let y = 790;
    page.drawText(shopName, { x: 40, y, size: 18, font: bold }); y -= 40;
    page.drawText("REÇU D'ACOMPTE", { x: 40, y, size: 16, font: bold, color: rgb(0.1, 0.3, 0.6) }); y -= 30;
    page.drawText(`N° ${deposit.receiptNumber}`, { x: 40, y, size: 11, font }); y -= 16;
    page.drawText(`Date : ${new Date(deposit.createdAt).toLocaleDateString('fr-FR')}`, { x: 40, y, size: 11, font }); y -= 30;

    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) }); y -= 24;
    page.drawText('Montant de l\'acompte versé :', { x: 40, y, size: 12, font });
    page.drawText(fmt(deposit.amount), { x: 400, y, size: 14, font: bold }); y -= 22;
    if (deposit.method) {
      page.drawText(`Mode de paiement : ${METHOD_LABEL[deposit.method] || deposit.method}`, { x: 40, y, size: 11, font }); y -= 18;
    }
    if (deposit.note) {
      page.drawText(`Note : ${deposit.note.slice(0, 90)}`, { x: 40, y, size: 10, font }); y -= 18;
    }
    y -= 16;
    page.drawText('Cet acompte sera déduit du montant total de la facture finale.', { x: 40, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="recu_${deposit.receiptNumber}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[deposit/receipt] failed', { depositId, error: msg });
    return NextResponse.json({ error: 'receipt_failed', detail: msg }, { status: 500 });
  }
}
