import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate?: string | null;
  status: string;
  type?: string; // Type de document: 'invoice' | 'quote' | 'credit'
  
  // Shop info
  shopName: string;
  shopAddress: string;
  shopZip: string;
  shopCity: string;
  shopPhone?: string;
  shopEmail?: string;
  shopSiret?: string;
  shopTVA?: string;
  
  // Customer info
  customerName: string;
  customerAddress?: string;
  customerZip?: string;
  customerCity?: string;
  
  // Lines
  lines: Array<{
    description: string;
    qty: number;
    unitPriceHT?: number;
    unitPriceTTC?: number;
    vatRate?: number;
    totalHT: number;
    totalTTC: number;
  }>;
  
  // Totals
  subtotalHT: number;
  vatAmount: number;
  totalTTC: number;
  pricingMode: 'AE_TTC' | 'HT_TVA';
  discountAmount?: number;
  
  // Payment
  paymentMethod?: string;
  paidAt?: string | null;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: Array<{ amount: number; method?: string | null; paidAt: string; note?: string | null }>;
  
  // Legal
  legalFooter?: string;
  // Branding
  logoBytes?: Uint8Array | null;
}

/**
 * Generate a compliant French invoice PDF
 * Includes all legal mentions required by French law
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const primaryColor = rgb(0.1, 0.4, 0.7); // Blue
  const textColor = rgb(0, 0, 0);
  const grayColor = rgb(0.5, 0.5, 0.5);
  
  let y = height - 50;
  
  // === HEADER ===
  if (data.logoBytes && data.logoBytes.byteLength > 0) {
    try {
      const img = await pdfDoc.embedPng(data.logoBytes).catch(async () => await pdfDoc.embedJpg(data.logoBytes!));
      const imgWidth = 120;
      const scale = imgWidth / img.width;
      const imgHeight = img.height * scale;
      page.drawImage(img, { x: 50, y: y - imgHeight + 10, width: imgWidth, height: imgHeight });
      y -= Math.max(25, imgHeight);
    } catch {
      // Fallback to text if logo embedding fails
      page.drawText(data.shopName.toUpperCase(), { x: 50, y, size: 20, font: fontBold, color: primaryColor });
      y -= 25;
    }
  } else {
    page.drawText(data.shopName.toUpperCase(), { x: 50, y, size: 20, font: fontBold, color: primaryColor });
    y -= 25;
  }
  page.drawText(`${data.shopAddress}`, { x: 50, y, size: 10, font, color: textColor });
  y -= 15;
  page.drawText(`${data.shopZip} ${data.shopCity}`, { x: 50, y, size: 10, font, color: textColor });
  
  if (data.shopPhone) {
    y -= 15;
    page.drawText(`Tél: ${data.shopPhone}`, { x: 50, y, size: 10, font, color: textColor });
  }
  
  if (data.shopEmail) {
    y -= 15;
    page.drawText(`Email: ${data.shopEmail}`, { x: 50, y, size: 10, font, color: textColor });
  }
  
  if (data.shopSiret) {
    y -= 15;
    page.drawText(`SIRET: ${data.shopSiret}`, { x: 50, y, size: 9, font, color: grayColor });
  }
  
  if (data.shopTVA) {
    y -= 12;
    page.drawText(`N° TVA: ${data.shopTVA}`, { x: 50, y, size: 9, font, color: grayColor });
  }
  
  // === INVOICE TITLE ===
  y = height - 50;
  const documentTitle = data.type === 'quote' ? 'DEVIS' : data.type === 'credit' ? 'AVOIR' : 'FACTURE';
  page.drawText(documentTitle, {
    x: width - 150,
    y,
    size: 24,
    font: fontBold,
    color: primaryColor,
  });
  
  y -= 30;
  page.drawText(`N° ${data.number}`, {
    x: width - 150,
    y,
    size: 12,
    font: fontBold,
    color: textColor,
  });
  
  y -= 20;
  const issueDate = new Date(data.issueDate).toLocaleDateString('fr-FR');
  page.drawText(`Date: ${issueDate}`, { x: width - 150, y, size: 10, font, color: textColor });
  
  if (data.dueDate) {
    y -= 15;
    const dueDate = new Date(data.dueDate).toLocaleDateString('fr-FR');
    page.drawText(`Échéance: ${dueDate}`, { x: width - 150, y, size: 10, font, color: textColor });
  }
  
  // === CUSTOMER INFO (styled block) ===
  y = height - 210;
  const addrX = 50;
  const addrW = 260;
  const addrH = 80;
  page.drawRectangle({ x: addrX - 6, y: y - addrH + 6, width: addrW + 12, height: addrH, color: rgb(0.97, 0.97, 0.98) });
  page.drawText('FACTURÉ À:', { x: addrX, y, size: 11, font: fontBold, color: textColor });
  y -= 20;
  page.drawText(data.customerName, { x: addrX, y, size: 11, font: fontBold, color: textColor });
  if (data.customerAddress) {
    y -= 15;
    page.drawText(data.customerAddress, { x: addrX, y, size: 10, font, color: textColor });
  }
  if (data.customerZip && data.customerCity) {
    y -= 15;
    page.drawText(`${data.customerZip} ${data.customerCity}`, { x: addrX, y, size: 10, font, color: textColor });
  }
  
  // === LINES TABLE ===
  y -= 40;
  const tableTop = y;
  const tableLeft = 50;
  const colWidths = [250, 50, 80, 80, 80];
  
  function drawTableHeader() {
    page.drawRectangle({ x: tableLeft, y: y - 20, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
    let x = tableLeft + 5;
    page.drawText('Description', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
    x += colWidths[0];
    page.drawText('Qté', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
    x += colWidths[1];
    if (data.pricingMode === 'HT_TVA') {
      page.drawText('PU HT', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
      x += colWidths[2];
      page.drawText('TVA', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
      x += colWidths[3];
      page.drawText('Total HT', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
    } else {
      page.drawText('PU TTC', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
      x += colWidths[2];
      page.drawText('', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
      x += colWidths[3];
      page.drawText('Total TTC', { x, y: y - 15, size: 10, font: fontBold, color: textColor });
    }
  }

  // First header
  drawTableHeader();
  
  y -= 25;
  
  // Table rows
  for (const line of data.lines) {
    if (y < 150) {
      // New page if needed
      page = pdfDoc.addPage([595, 842]);
      y = height - 80;
      drawTableHeader();
      y -= 25;
    }
    let x = tableLeft + 5;
    // Wrap description into up to 2 lines for simplicity
    const descLines = wrapText(line.description, 55).slice(0, 2);
    page.drawText(descLines[0] || '', { x, y, size: 9, font, color: textColor });
    if (descLines[1]) {
      page.drawText(descLines[1], { x, y: y - 12, size: 9, font, color: textColor });
    }
    x += colWidths[0];
    page.drawText(String(line.qty), { x, y, size: 9, font, color: textColor });
    x += colWidths[1];
    if (data.pricingMode === 'HT_TVA') {
      page.drawText(`${(line.unitPriceHT || 0).toFixed(2)} €`, { x, y, size: 9, font, color: textColor });
      x += colWidths[2];
      page.drawText(`${(line.vatRate || 0)}%`, { x, y, size: 9, font, color: textColor });
      x += colWidths[3];
      page.drawText(`${line.totalHT.toFixed(2)} €`, { x, y, size: 9, font, color: textColor });
    } else {
      page.drawText(`${(line.unitPriceTTC || 0).toFixed(2)} €`, { x, y, size: 9, font, color: textColor });
      x += colWidths[2];
      x += colWidths[3];
      page.drawText(`${line.totalTTC.toFixed(2)} €`, { x, y, size: 9, font, color: textColor });
    }
    // Row separator
    page.drawLine({ start: { x: tableLeft, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    y -= (descLines.length > 1 ? 24 : 18);
  }
  
  // === TOTALS ===
  y -= 20;
  const totalsX = width - 200;
  
  if (data.pricingMode === 'HT_TVA') {
    page.drawText(`Sous-total HT:`, { x: totalsX, y, size: 10, font, color: textColor });
    page.drawText(`${data.subtotalHT.toFixed(2)} €`, { x: totalsX + 100, y, size: 10, font, color: textColor });
    
    y -= 18;
    page.drawText(`TVA:`, { x: totalsX, y, size: 10, font, color: textColor });
    page.drawText(`${data.vatAmount.toFixed(2)} €`, { x: totalsX + 100, y, size: 10, font, color: textColor });
    
    y -= 18;
  }
  if (data.discountAmount && data.discountAmount > 0) {
    page.drawText(`Remise:`, { x: totalsX, y, size: 10, font, color: textColor });
    page.drawText(`- ${data.discountAmount.toFixed(2)} €`, { x: totalsX + 100, y, size: 10, font, color: textColor });
    y -= 18;
  }
  
  page.drawRectangle({
    x: totalsX - 5,
    y: y - 18,
    width: 190,
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  page.drawText(`TOTAL TTC:`, { x: totalsX, y: y - 5, size: 12, font: fontBold, color: primaryColor });
  page.drawText(`${data.totalTTC.toFixed(2)} €`, { x: totalsX + 100, y: y - 5, size: 12, font: fontBold, color: primaryColor });
  
  // === PAYMENT INFO ===
  if (data.paidAt) {
    y -= 30;
    const paidDate = new Date(data.paidAt).toLocaleDateString('fr-FR');
    page.drawText(`✓ Payée le ${paidDate}`, { x: totalsX, y, size: 10, font: fontBold, color: rgb(0, 0.6, 0) });
    if (data.paymentMethod) {
      y -= 15;
      page.drawText(`Moyen: ${data.paymentMethod}`, { x: totalsX, y, size: 9, font, color: grayColor });
    }
  }
  if (data.paidAmount != null) {
    y -= 20;
    page.drawText(`Payé:`, { x: totalsX, y, size: 10, font, color: textColor });
    page.drawText(`${(data.paidAmount || 0).toFixed(2)} €`, { x: totalsX + 100, y, size: 10, font, color: textColor });
    y -= 18;
    if (data.remainingAmount != null && data.remainingAmount > 0) {
      page.drawText(`Restant dû:`, { x: totalsX, y, size: 11, font: fontBold, color: rgb(0.7, 0.2, 0.2) });
      page.drawText(`${data.remainingAmount.toFixed(2)} €`, { x: totalsX + 100, y, size: 11, font: fontBold, color: rgb(0.7, 0.2, 0.2) });
    }
  }
  
  // === LEGAL FOOTER ===
  // Payments breakdown table (optional)
  if (data.payments && data.payments.length > 0) {
    y = Math.max(120, y - 10);
    page.drawText('Paiements:', { x: 50, y, size: 10, font: fontBold, color: textColor });
    y -= 16;
    // Header row
    page.drawRectangle({ x: 50, y: y - 16, width: width - 100, height: 16, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Date', { x: 55, y: y - 12, size: 9, font: fontBold, color: textColor });
    page.drawText('Montant', { x: 200, y: y - 12, size: 9, font: fontBold, color: textColor });
    page.drawText('Mode', { x: 310, y: y - 12, size: 9, font: fontBold, color: textColor });
    page.drawText('Note', { x: 400, y: y - 12, size: 9, font: fontBold, color: textColor });
    y -= 22;
    for (const p of data.payments) {
      if (y < 80) break; // avoid overlapping legal footer
      const d = new Date(p.paidAt).toLocaleDateString('fr-FR');
      page.drawText(d, { x: 55, y, size: 9, font, color: textColor });
      page.drawText(`${(p.amount || 0).toFixed(2)} €`, { x: 200, y, size: 9, font, color: textColor });
      page.drawText(`${p.method || ''}`, { x: 310, y, size: 9, font, color: textColor });
      const note = p.note ? (p.note.length > 40 ? p.note.slice(0, 37) + '...' : p.note) : '';
      page.drawText(note, { x: 400, y, size: 9, font, color: textColor });
      y -= 16;
    }
  }

  // === LEGAL FOOTER ===
  y = Math.min(y, 100);
  
  const legalText = data.legalFooter || 
    "En cas de retard de paiement, une pénalité égale à 3 fois le taux d'intérêt légal sera appliquée, " +
    "à laquelle s'ajoutera une indemnité forfaitaire pour frais de recouvrement de 40 euros.";
  
  const legalLines = wrapText(legalText, 80);
  for (const line of legalLines) {
    page.drawText(line, { x: 50, y, size: 7, font, color: grayColor });
    y -= 10;
  }
  
  if (data.pricingMode === 'AE_TTC') {
    y -= 5;
    page.drawText("TVA non applicable, art. 293 B du CGI (Auto-entrepreneur)", { 
      x: 50, y, size: 7, font: fontBold, color: grayColor 
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Wrap text to fit width
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
