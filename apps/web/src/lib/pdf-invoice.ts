import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate?: string | null;
  status: string;
  type?: string; // Type de document: 'invoice' | 'quote' | 'credit'
  validUntil?: string | null; // Pour les devis
  parentId?: string | null; // Pour les avoirs (référence facture d'origine)
  
  // Shop info
  shopName: string;
  shopAddress: string;
  shopZip: string;
  shopCity: string;
  shopPhone?: string;
  shopEmail?: string;
  shopSiret?: string;
  shopTVA?: string;
  shopRCS?: string; // Registre du Commerce et des Sociétés
  shopCapital?: string; // Capital social
  shopInsurance?: string; // Assurance RC Pro
  
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
  
  // === HEADER - INFORMATIONS ATELIER ===
  // Logo ou nom
  if (data.logoBytes && data.logoBytes.byteLength > 0) {
    try {
      const img = await pdfDoc.embedPng(data.logoBytes).catch(async () => await pdfDoc.embedJpg(data.logoBytes!));
      const imgWidth = 100;
      const scale = imgWidth / img.width;
      const imgHeight = img.height * scale;
      page.drawImage(img, { x: 50, y: y - imgHeight + 10, width: imgWidth, height: imgHeight });
      y -= Math.max(25, imgHeight);
    } catch {
      page.drawText(data.shopName.toUpperCase(), { x: 50, y, size: 18, font: fontBold, color: primaryColor });
      y -= 25;
    }
  } else {
    page.drawText(data.shopName.toUpperCase(), { x: 50, y, size: 18, font: fontBold, color: primaryColor });
    y -= 25;
  }
  
  // Adresse
  page.drawText(`${data.shopAddress}`, { x: 50, y, size: 9, font, color: textColor });
  y -= 13;
  page.drawText(`${data.shopZip} ${data.shopCity}`, { x: 50, y, size: 9, font, color: textColor });
  y -= 13;
  
  // Contact
  if (data.shopPhone) {
    page.drawText(`Tél : ${data.shopPhone}`, { x: 50, y, size: 9, font, color: textColor });
    y -= 13;
  }
  if (data.shopEmail) {
    page.drawText(`Email : ${data.shopEmail}`, { x: 50, y, size: 9, font, color: textColor });
    y -= 13;
  }
  
  // Ligne séparatrice
  y -= 5;
  page.drawLine({ start: { x: 50, y }, end: { x: 280, y }, thickness: 0.5, color: grayColor });
  y -= 10;
  
  // Informations légales
  if (data.shopSiret) {
    page.drawText(`SIRET : ${data.shopSiret}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 11;
  }
  if (data.shopTVA) {
    page.drawText(`N° TVA Intracommunautaire : ${data.shopTVA}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 11;
  }
  if (data.shopRCS) {
    page.drawText(`RCS : ${data.shopRCS}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 11;
  }
  if (data.shopCapital) {
    page.drawText(`Capital social : ${data.shopCapital}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 11;
  }
  if (data.shopInsurance) {
    page.drawText(`Assurance RC Pro : ${data.shopInsurance}`, { x: 50, y, size: 7, font, color: grayColor });
  }
  
  // === DOCUMENT TITLE & INFO (Right side) ===
  y = height - 50;
  const documentTitle = data.type === 'quote' ? 'DEVIS' : data.type === 'credit' ? 'AVOIR' : 'FACTURE';
  
  // Encadré pour le titre
  const titleBoxX = width - 180;
  const titleBoxY = y - 35;
  page.drawRectangle({ 
    x: titleBoxX, 
    y: titleBoxY, 
    width: 160, 
    height: 35, 
    borderColor: primaryColor, 
    borderWidth: 2 
  });
  
  page.drawText(documentTitle, {
    x: titleBoxX + 10,
    y: titleBoxY + 15,
    size: 20,
    font: fontBold,
    color: primaryColor,
  });
  
  y -= 50;
  page.drawText(`N° ${data.number}`, {
    x: width - 170,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
  });
  
  y -= 18;
  const issueDate = new Date(data.issueDate).toLocaleDateString('fr-FR');
  page.drawText(`Date d'émission : ${issueDate}`, { x: width - 170, y, size: 9, font, color: textColor });
  
  // Spécifique selon le type de document
  if (data.type === 'quote' && data.validUntil) {
    y -= 15;
    const validDate = new Date(data.validUntil).toLocaleDateString('fr-FR');
    page.drawText(`Valide jusqu'au : ${validDate}`, { x: width - 170, y, size: 9, font: fontBold, color: rgb(0.8, 0.4, 0) });
  } else if (data.type === 'credit' && data.parentId) {
    y -= 15;
    page.drawText(`Avoir sur facture : ${data.parentId}`, { x: width - 170, y, size: 9, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
  } else if (data.dueDate) {
    y -= 15;
    const dueDate = new Date(data.dueDate).toLocaleDateString('fr-FR');
    page.drawText(`Date d'échéance : ${dueDate}`, { x: width - 170, y, size: 9, font, color: textColor });
  }
  
  // === CUSTOMER INFO (styled block) ===
  y = height - 210;
  const addrX = 50;
  const addrW = 260;
  
  // Calculer la hauteur nécessaire
  let addrLines = 2; // FACTURÉ À + nom
  if (data.customerAddress) addrLines++;
  if (data.customerZip && data.customerCity) addrLines++;
  const addrH = addrLines * 18 + 10;
  
  // Fond grisé
  page.drawRectangle({ 
    x: addrX - 5, 
    y: y - addrH + 8, 
    width: addrW, 
    height: addrH, 
    color: rgb(0.95, 0.95, 0.95) 
  });
  
  page.drawText('FACTURÉ À:', { x: addrX, y, size: 11, font: fontBold, color: textColor });
  y -= 18;
  page.drawText(data.customerName, { x: addrX, y, size: 11, font: fontBold, color: textColor });
  if (data.customerAddress) {
    y -= 16;
    page.drawText(data.customerAddress, { x: addrX, y, size: 10, font, color: textColor });
  }
  if (data.customerZip && data.customerCity) {
    y -= 16;
    page.drawText(`${data.customerZip} ${data.customerCity}`, { x: addrX, y, size: 10, font, color: textColor });
  }
  
  // === LINES TABLE ===
  y -= 40;
  const tableTop = y;
  const tableLeft = 50;
  const colWidths = [250, 50, 80, 80, 80];
  
  function drawTableHeader() {
    // Calculer la largeur totale nécessaire pour le tableau
    const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0) + 10; // +10 pour les marges
    
    // Fond grisé pour l'en-tête du tableau (aligné avec les autres blocs grisés)
    page.drawRectangle({ 
      x: 45, // Aligné avec les autres blocs grisés (addrX - 5)
      y: y - 22, 
      width: totalTableWidth * 0.99, // Réduit de 1%
      height: 22, 
      color: rgb(0.9, 0.9, 0.9) 
    });
    let x = tableLeft + 5;
    page.drawText('Description', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
    x += colWidths[0];
    page.drawText('Qté', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
    x += colWidths[1];
    if (data.pricingMode === 'HT_TVA') {
      page.drawText('PU HT', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
      x += colWidths[2];
      page.drawText('TVA', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
      x += colWidths[3];
      page.drawText('Total HT', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
    } else {
      page.drawText('PU TTC', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
      x += colWidths[2];
      page.drawText('', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
      x += colWidths[3];
      page.drawText('Total TTC', { x, y: y - 13, size: 10, font: fontBold, color: textColor });
    }
  }

  // First header
  drawTableHeader();
  
  y -= 30; // Espace supplémentaire entre l'en-tête et la première ligne
  
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
  
  // Calculer la hauteur du bloc total (TOTAL TTC + Payé + Restant dû)
  let totalBlockLines = 1; // TOTAL TTC
  if (data.paidAmount != null) totalBlockLines++; // Payé
  if (data.remainingAmount != null && data.remainingAmount > 0) totalBlockLines++; // Restant dû
  const totalBlockHeight = totalBlockLines * 20 + 4;
  
  // Fond grisé pour tout le bloc total
  page.drawRectangle({
    x: totalsX - 5,
    y: y - totalBlockHeight + 4,
    width: 190,
    height: totalBlockHeight,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  page.drawText(`TOTAL TTC:`, { x: totalsX, y: y - 7, size: 12, font: fontBold, color: primaryColor });
  page.drawText(`${data.totalTTC.toFixed(2)} €`, { x: totalsX + 100, y: y - 7, size: 12, font: fontBold, color: primaryColor });
  y -= 20;
  
  // Afficher Payé et Restant dû dans le même bloc grisé
  if (data.paidAmount != null) {
    page.drawText(`Payé:`, { x: totalsX, y: y - 7, size: 10, font, color: textColor });
    page.drawText(`${(data.paidAmount || 0).toFixed(2)} €`, { x: totalsX + 100, y: y - 7, size: 10, font, color: textColor });
    y -= 20;
    if (data.remainingAmount != null && data.remainingAmount > 0) {
      page.drawText(`Restant dû:`, { x: totalsX, y: y - 7, size: 11, font: fontBold, color: rgb(0.7, 0.2, 0.2) });
      page.drawText(`${data.remainingAmount.toFixed(2)} €`, { x: totalsX + 100, y: y - 7, size: 11, font: fontBold, color: rgb(0.7, 0.2, 0.2) });
    }
  }
  
  // === PAYMENT INFO ===
  if (data.paidAt) {
    y -= 25;
    const paidDate = new Date(data.paidAt).toLocaleDateString('fr-FR');
    page.drawText(`✓ Payée le ${paidDate}`, { x: totalsX, y, size: 10, font: fontBold, color: rgb(0, 0.6, 0) });
    if (data.paymentMethod) {
      y -= 15;
      page.drawText(`Moyen: ${data.paymentMethod}`, { x: totalsX, y, size: 9, font, color: grayColor });
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
  // S'assurer qu'on a assez d'espace en bas de page
  y -= 20;
  if (y < 200) {
    // Nouvelle page si pas assez d'espace
    page = pdfDoc.addPage([595, 842]);
    y = height - 80;
  }
  
  // Ligne de séparation
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: grayColor });
  y -= 15;
  
  // Titre de la section
  page.drawText('CONDITIONS GÉNÉRALES', { x: 50, y, size: 8, font: fontBold, color: textColor });
  y -= 12;
  
  // Mentions légales selon le type de document
  let legalText = '';
  
  if (data.type === 'quote') {
    // MENTIONS POUR DEVIS
    legalText = data.legalFooter || 
      "Ce devis est valable pour la durée indiquée. Les travaux ne débuteront qu'après acceptation écrite du devis et versement de l'acompte éventuel. " +
      "Conformément aux articles L217-4 et suivants du Code de la consommation, les produits vendus bénéficient de la garantie légale de conformité et de la garantie contre les vices cachés. " +
      "Conditions de règlement : paiement à réception de facture. Tout retard de paiement entraînera l'application de pénalités de retard au taux de 3 fois le taux d'intérêt légal, " +
      "ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 euros (article L441-6 du Code de commerce).";
  } else if (data.type === 'credit') {
    // MENTIONS POUR AVOIR
    legalText = data.legalFooter || 
      "Cet avoir annule et remplace la facture mentionnée ci-dessus pour le montant indiqué. " +
      "Il peut être utilisé pour le règlement de futures prestations ou faire l'objet d'un remboursement selon les conditions convenues.";
  } else {
    // MENTIONS POUR FACTURE
    legalText = data.legalFooter || 
      "Conditions de règlement : paiement à réception de facture. En cas de retard de paiement, des pénalités égales à 3 fois le taux d'intérêt légal seront appliquées, " +
      "auxquelles s'ajoutera une indemnité forfaitaire pour frais de recouvrement de 40 euros (article L441-6 du Code de commerce). " +
      "Conformément aux articles L217-4 et suivants du Code de la consommation, les produits vendus bénéficient de la garantie légale de conformité (2 ans) et de la garantie contre les vices cachés. " +
      "Les réparations sont garanties 3 mois pièces et main d'œuvre. Aucun escompte pour paiement anticipé.";
  }
  
  // Fond grisé pour les mentions légales
  // Calculer la largeur disponible en pixels (largeur page - marges)
  const availableWidth = width - 100; // 50px de marge de chaque côté
  const fontSize = 7;
  const lineHeight = 10;
  
  // Wrapper le texte en fonction de la largeur réelle disponible
  const avgCharWidth = font.widthOfTextAtSize('x', fontSize);
  const maxCharsPerLine = Math.floor(availableWidth / avgCharWidth);
  const legalLines = wrapText(legalText, maxCharsPerLine);
  
  // Calculer la hauteur totale nécessaire
  const legalHeight = legalLines.length * lineHeight + 10;
  
  // Vérifier si on a assez d'espace pour tout le bloc
  if (y - legalHeight < 40) {
    page = pdfDoc.addPage([595, 842]);
    y = height - 80;
    page.drawText('CONDITIONS GÉNÉRALES', { x: 50, y, size: 8, font: fontBold, color: textColor });
    y -= 12;
  }
  
  // Dessiner le fond grisé (toute la largeur disponible)
  page.drawRectangle({
    x: 45,
    y: y - legalHeight + 5,
    width: width - 90,
    height: legalHeight,
    color: rgb(0.97, 0.97, 0.97),
  });
  
  // Afficher le texte sur le fond grisé
  y -= 5;
  for (const line of legalLines) {
    page.drawText(line, { x: 50, y, size: fontSize, font, color: rgb(0.3, 0.3, 0.3) });
    y -= lineHeight;
  }
  
  y -= 10;
  
  // TVA non applicable pour auto-entrepreneur
  if (data.pricingMode === 'AE_TTC') {
    if (y < 50) {
      page = pdfDoc.addPage([595, 842]);
      y = height - 80;
    }
    const tvaTxt = "TVA non applicable, article 293 B du Code Général des Impôts (Auto-entrepreneur)";
    const txtWidth = font.widthOfTextAtSize(tvaTxt, 7);
    page.drawRectangle({
      x: 45,
      y: y - 15,
      width: txtWidth + 10,
      height: 18,
      color: rgb(0.95, 0.95, 0.95),
    });
    page.drawText(tvaTxt, { 
      x: 50, y: y - 10, size: 7, font: fontBold, color: rgb(0.2, 0.2, 0.2)
    });
    y -= 25;
  }
  
  // Note spéciale pour devis
  if (data.type === 'quote') {
    if (y < 60) {
      page = pdfDoc.addPage([595, 842]);
      y = height - 80;
    }
    page.drawText("Bon pour accord (signature précédée de la mention 'Lu et approuvé') :", { 
      x: 50, y, size: 9, font: fontBold, color: textColor 
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
