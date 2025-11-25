import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Formate un numéro de document professionnel
 * Format: PREFIX-YYYY-NNNN (ex: FAC-2025-0001)
 */
export function formatDocumentNumber(fullId: string, type: string, issueDate: string): string {
  // Préfixe selon le type
  const prefix = type === 'quote' ? 'DEV' : type === 'credit' ? 'AVO' : 'FAC';
  
  // Année d'émission
  const year = new Date(issueDate).getFullYear();
  
  // Extraire hash court de l'ID pour numéro unique (4 derniers car alphanum)
  const hash = fullId.slice(-8).toUpperCase();
  // Convertir en nombre pour format 0001, 0002, etc.
  const numericPart = parseInt(hash, 36) % 10000;
  const formattedNum = String(numericPart).padStart(4, '0');
  
  return `${prefix}-${year}-${formattedNum}`;
}

export interface InvoiceData {
  number: string;
  issueDate: string;
  dueDate?: string | null;
  status: string;
  type?: string; // Type de document: 'invoice' | 'quote' | 'credit'
  validUntil?: string | null; // Pour les devis
  parentId?: string | null; // Pour les avoirs (référence facture d'origine)
  
  // Shop info
  shopName: string;
  shopLogo?: string | null; // Chemin logo atelier (.ico ou .png)
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
  
  // === DESIGN SYSTEM - Palette professionnelle et lisible ===
  const COLORS = {
    // Bleus (plus clairs et lisibles)
    primary: rgb(0.2, 0.5, 0.85),          // Bleu principal lisible (#3380D9)
    primaryLight: rgb(0.85, 0.92, 0.98),   // Fond bleu très clair
    primaryDark: rgb(0.15, 0.4, 0.7),      // Bleu foncé pour contraste
    
    // Textes (noir et gris optimisés)
    text: rgb(0.2, 0.2, 0.2),              // Texte principal (quasi-noir)
    textMuted: rgb(0.45, 0.45, 0.45),      // Texte secondaire (gris moyen)
    textLight: rgb(0.6, 0.6, 0.6),         // Texte discret (gris clair)
    
    // Fonds et bordures
    bgLight: rgb(0.97, 0.97, 0.97),        // Fond gris très clair
    bgMedium: rgb(0.93, 0.93, 0.93),       // Fond gris clair
    border: rgb(0.88, 0.88, 0.88),         // Bordure gris
    borderLight: rgb(0.92, 0.92, 0.92),    // Bordure gris clair
    
    // Couleurs sémantiques
    success: rgb(0.2, 0.65, 0.25),         // Vert
    warning: rgb(0.95, 0.75, 0.15),        // Jaune/Orange
    danger: rgb(0.85, 0.25, 0.25),         // Rouge
    
    // Couleurs d'accentuation
    white: rgb(1, 1, 1),                   // Blanc pur
    black: rgb(0, 0, 0),                   // Noir pur (titres importants)
  };
  
  const primaryColor = COLORS.primary;
  const textColor = COLORS.text;
  const grayColor = COLORS.textMuted;
  
  let y = height - 50;
  
  // === HEADER - INFORMATIONS ATELIER ===
  // Logo ou cadre fallback
  if (data.logoBytes && data.logoBytes.byteLength > 0) {
    // Logo fourni - tenter PNG, JPG, ou skip si .ico
    try {
      let img;
      try {
        img = await pdfDoc.embedPng(data.logoBytes);
      } catch {
        try {
          img = await pdfDoc.embedJpg(data.logoBytes);
        } catch {
          // Format non support\u00e9 (.ico) - afficher cadre fallback
          throw new Error('Format non support\u00e9');
        }
      }
      
      const maxWidth = 50;
      const maxHeight = 50;
      let imgWidth = img.width;
      let imgHeight = img.height;
      
      // Redimensionner proportionnellement
      if (imgWidth > maxWidth || imgHeight > maxHeight) {
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio);
        imgWidth = imgWidth * scale;
        imgHeight = imgHeight * scale;
      }
      
      page.drawImage(img, { x: 50, y: y - imgHeight, width: imgWidth, height: imgHeight });
      y -= (imgHeight + 20); // ✅ Espacement augmenté pour aérer le haut du document
    } catch {
      // Erreur chargement logo -> cadre fallback
      page.drawRectangle({
        x: 50, y: y - 32, width: 32, height: 32,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
        color: rgb(0.95, 0.95, 0.95),
      });
      page.drawText('votre', { x: 54, y: y - 14, size: 6, font, color: grayColor });
      page.drawText('logo', { x: 56, y: y - 22, size: 6, font, color: grayColor });
      y -= 50; // ✅ Espacement augmenté pour aérer
    }
  } else {
    // Pas de logo -> cadre "votre logo"
    page.drawRectangle({
      x: 50, y: y - 32, width: 32, height: 32,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 0.95),
    });
    page.drawText('votre', { x: 54, y: y - 14, size: 6, font, color: grayColor });
    page.drawText('logo', { x: 56, y: y - 22, size: 6, font, color: grayColor });
    y -= 50; // ✅ Espacement augmenté pour aérer
  }
  
  // === NOM ATELIER (sous le logo, toujours affiché) ===
  page.drawText(data.shopName.toUpperCase(), { 
    x: 50, 
    y, 
    size: 16,  // Augmenté de 14 à 16 pour meilleure visibilité
    font: fontBold, 
    color: primaryColor 
  });
  y -= 22;
  
  // === ADRESSE ATELIER ===
  page.drawText(`${data.shopAddress}`, { x: 50, y, size: 10, font, color: textColor });
  y -= 14;
  page.drawText(`${data.shopZip} ${data.shopCity}`, { x: 50, y, size: 10, font, color: textColor });
  y -= 14;
  
  // === CONTACT ATELIER ===
  if (data.shopPhone) {
    page.drawText(`Tél: ${data.shopPhone}`, { x: 50, y, size: 10, font, color: textColor });
    y -= 14;
  }
  if (data.shopEmail) {
    page.drawText(`Email: ${data.shopEmail}`, { x: 50, y, size: 10, font, color: textColor });
    y -= 14;
  }
  
  // === LIGNE SÉPARATRICE ===
  y -= 8;
  page.drawLine({ 
    start: { x: 50, y }, 
    end: { x: 280, y }, 
    thickness: 1, 
    color: COLORS.border 
  });
  y -= 10;
  
  // === INFORMATIONS LÉGALES (police plus petite mais lisible) ===
  if (data.shopSiret) {
    page.drawText(`SIRET: ${data.shopSiret}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 12;
  }
  if (data.shopTVA) {
    page.drawText(`N° TVA Intracommunautaire: ${data.shopTVA}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 12;
  }
  if (data.shopRCS) {
    page.drawText(`RCS: ${data.shopRCS}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 12;
  }
  if (data.shopCapital) {
    page.drawText(`Capital social: ${data.shopCapital}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 12;
  }
  if (data.shopInsurance) {
    page.drawText(`Assurance RC Pro: ${data.shopInsurance}`, { x: 50, y, size: 8, font, color: grayColor });
    y -= 12;
  }
  
  // Sauvegarder Y pour calculer position client dynamiquement
  const shopInfoEndY = y;
  
  // === DOCUMENT TITLE & INFO (Right side) ===
  // ✅ FIX: Utiliser position fixe indépendante de la colonne gauche
  const rightColumnY = height - 50;  // Position de départ pour colonne droite
  const documentTitle = data.type === 'quote' ? 'DEVIS' : data.type === 'credit' ? 'AVOIR' : 'FACTURE';
  
  // ✅ Encadré titre moderne - position fixe claire
  const titleBoxWidth = 150;
  const titleBoxHeight = 38;
  const titleBoxX = width - titleBoxWidth - 50;  // Marge droite = 50px
  const titleBoxY = rightColumnY - titleBoxHeight;  // Directement sous le haut de page
  
  // Fond bleu principal (plus clair et lisible)
  page.drawRectangle({ 
    x: titleBoxX, 
    y: titleBoxY, 
    width: titleBoxWidth, 
    height: titleBoxHeight, 
    color: primaryColor,  // Bleu plus clair qu'avant
  });
  
  // Texte blanc centré verticalement ET horizontalement
  const titleSize = 20;
  const titleWidth = fontBold.widthOfTextAtSize(documentTitle, titleSize);
  page.drawText(documentTitle, {
    x: titleBoxX + (titleBoxWidth - titleWidth) / 2,  // Centré horizontalement
    y: titleBoxY + (titleBoxHeight - titleSize) / 2 + 3,  // Centré verticalement
    size: titleSize,
    font: fontBold,
    color: COLORS.white,
  });
  
  // === INFOS DOCUMENT (sous le titre) ===
  let documentInfoY = titleBoxY - 52;  // ✅ 52px sous le cadre (3 lignes de plus = 42px)
  const formattedNumber = formatDocumentNumber(data.number, data.type || 'invoice', data.issueDate);
  const infoX = titleBoxX;  // ✅ Aligné avec le bord gauche du titre
  
  // Numéro de document (plus visible)
  page.drawText(`N° ${formattedNumber}`, {
    x: infoX,
    y: documentInfoY,
    size: 12,
    font: fontBold,
    color: textColor,
  });
  
  // Date d'émission
  documentInfoY -= 18;
  const issueDate = new Date(data.issueDate).toLocaleDateString('fr-FR');
  page.drawText(`Date d'émission: ${issueDate}`, { 
    x: infoX, 
    y: documentInfoY, 
    size: 10,
    font, 
    color: textColor 
  });
  
  // === DATES SPÉCIFIQUES selon type de document ===
  if (data.type === 'quote' && data.validUntil) {
    documentInfoY -= 16;
    const validDate = new Date(data.validUntil).toLocaleDateString('fr-FR');
    page.drawText(`Valide jusqu'au: ${validDate}`, { 
      x: infoX, 
      y: documentInfoY, 
      size: 10, 
      font: fontBold, 
      color: COLORS.warning 
    });
  } else if (data.type === 'credit' && data.parentId) {
    documentInfoY -= 16;
    const parentNumber = formatDocumentNumber(data.parentId, 'invoice', data.issueDate);
    page.drawText(`Avoir sur facture: ${parentNumber}`, { 
      x: infoX, 
      y: documentInfoY, 
      size: 10, 
      font: fontBold, 
      color: COLORS.danger 
    });
  } else if (data.dueDate) {
    documentInfoY -= 16;
    const dueDate = new Date(data.dueDate).toLocaleDateString('fr-FR');
    page.drawText(`Date d'échéance: ${dueDate}`, { 
      x: infoX, 
      y: documentInfoY, 
      size: 10, 
      font, 
      color: textColor 
    });
  }
  
  // === CUSTOMER INFO (styled block) ===
  // Position dynamique: sous les infos atelier avec marge de sécurité
  let customerY = Math.min(shopInfoEndY - 20, height - 210);
  const addrX = 50;
  const addrW = 260;
  
  // ✅ Calculer la hauteur nécessaire pour le bloc client
  let addrLines = 2; // En-tête + nom
  if (data.customerAddress) addrLines++;
  if (data.customerZip && data.customerCity) addrLines++;
  const addrLineHeight = 16;
  const addrH = addrLines * addrLineHeight + 20;  // +20px padding
  
  // ✅ BLOC CLIENT - Design moderne avec en-tête bleu
  // En-tête bleu avec texte blanc
  const headerHeight = 26;
  page.drawRectangle({ 
    x: addrX, 
    y: customerY - headerHeight, 
    width: addrW, 
    height: headerHeight, 
    color: primaryColor,
  });
  
  // Texte "FACTURÉ À:" en blanc, centré verticalement
  page.drawText('FACTURÉ À :', { 
    x: addrX + 12, 
    y: customerY - headerHeight/2 - 4,  // Centré verticalement
    size: 11, 
    font: fontBold, 
    color: COLORS.white 
  });
  
  // Corps du bloc avec fond gris clair
  page.drawRectangle({ 
    x: addrX, 
    y: customerY - addrH, 
    width: addrW, 
    height: addrH - headerHeight, 
    color: COLORS.bgLight,
  });
  
  // Contenu client avec padding interne
  let clientY = customerY - headerHeight - 16;  // Décalage depuis en-tête + padding
  const clientX = addrX + 12;  // Padding gauche
  
  page.drawText(data.customerName, { 
    x: clientX, 
    y: clientY, 
    size: 11, 
    font: fontBold, 
    color: textColor 
  });
  
  if (data.customerAddress) {
    clientY -= addrLineHeight;
    page.drawText(data.customerAddress, { 
      x: clientX, 
      y: clientY, 
      size: 10, 
      font, 
      color: textColor 
    });
  }
  
  if (data.customerZip && data.customerCity) {
    clientY -= addrLineHeight;
    page.drawText(`${data.customerZip} ${data.customerCity}`, { 
      x: clientX, 
      y: clientY, 
      size: 10, 
      font, 
      color: textColor 
    });
  }
  
  customerY = customerY - addrH;  // Positionner y après le bloc client
  
  // === LINES TABLE ===
  y = customerY - 40;
  const tableLeft = 50;
  // ✅ Colonnes: Description(250), Qté(50), PU(80), TVA(60 réduit), Total(90 décalé gauche)
  const colWidths = [250, 50, 80, 60, 90];
  
  function drawTableHeader() {
    // ✅ Largeur tableau : toute la largeur disponible moins marges
    const totalTableWidth = width - 100; // 50px marge gauche + 50px marge droite
    const headerHeight = 28;
    
    // ✅ EN-TÊTE MODERNE - Fond bleu clair
    page.drawRectangle({ 
      x: tableLeft, 
      y: y - headerHeight, 
      width: totalTableWidth, 
      height: headerHeight, 
      color: COLORS.primaryLight, // Bleu très clair
    });
    
    // Bordure supérieure bleu foncé (accent)
    page.drawRectangle({ 
      x: tableLeft, 
      y: y - 2, 
      width: totalTableWidth, 
      height: 2, 
      color: primaryColor,
    });
    
    // Bordure inférieure gris clair
    page.drawRectangle({ 
      x: tableLeft, 
      y: y - headerHeight, 
      width: totalTableWidth, 
      height: 1, 
      color: COLORS.border,
    });
    
    // ✅ TEXTES CENTRÉS VERTICALEMENT dans l'en-tête
    const textY = y - headerHeight/2 - 4;  // Centrage vertical parfait
    
    let x = tableLeft + 10;
    page.drawText('Description', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
    
    x += colWidths[0];
    page.drawText('Qté', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
    
    x += colWidths[1];
    if (data.pricingMode === 'HT_TVA') {
      page.drawText('PU HT', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
      x += colWidths[2];
      page.drawText('TVA', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
      x += colWidths[3];
      page.drawText('Total HT', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
    } else {
      page.drawText('PU TTC', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
      x += colWidths[2];
      // Colonne vide
      x += colWidths[3];
      page.drawText('Total TTC', { x, y: textY, size: 10, font: fontBold, color: primaryColor });
    }
    
    y -= headerHeight;  // Ajuster y après l'en-tête
  }

  // First header
  drawTableHeader();
  
  y -= 20; // ✅ Réduit : 30 → 20 (gain de place)
  
  // Table rows
  for (const line of data.lines) {
    if (y < 150) {
      // New page if needed
      page = pdfDoc.addPage([595, 842]);
      y = height - 80;
      drawTableHeader();
      y -= 25;
    }
    let x = tableLeft + 10;  // Padding gauche augmenté
    
    // === DESCRIPTION (wrap sur 2 lignes max) ===
    const descLines = wrapText(line.description, 55).slice(0, 2);
    page.drawText(descLines[0] || '', { x, y, size: 10, font, color: textColor });  // Taille augmentée 9→10
    if (descLines[1]) {
      page.drawText(descLines[1], { x, y: y - 13, size: 10, font, color: textColor });
    }
    
    // === QUANTITÉ ===
    x += colWidths[0];
    page.drawText(String(line.qty), { x, y, size: 10, font, color: textColor });
    
    // === PRIX & TOTAUX (selon mode) ===
    x += colWidths[1];
    if (data.pricingMode === 'HT_TVA') {
      // Mode HT + TVA
      page.drawText(`${(line.unitPriceHT || 0).toFixed(2)} €`, { x, y, size: 10, font, color: textColor });
      x += colWidths[2];
      page.drawText(`${(line.vatRate || 0)}%`, { x, y, size: 10, font, color: textColor });
      x += colWidths[3];
      page.drawText(`${line.totalHT.toFixed(2)} €`, { x, y, size: 10, font, color: textColor });
    } else {
      // Mode TTC (auto-entrepreneur)
      page.drawText(`${(line.unitPriceTTC || 0).toFixed(2)} €`, { x, y, size: 10, font, color: textColor });
      x += colWidths[2];
      x += colWidths[3];  // Skip colonne TVA
      page.drawText(`${line.totalTTC.toFixed(2)} €`, { x, y, size: 10, font, color: textColor });
    }
    
    // === SÉPARATEUR de ligne (gris très clair) ===
    page.drawLine({ 
      start: { x: tableLeft, y: y - 5 }, 
      end: { x: width - 50, y: y - 5 }, 
      thickness: 0.5, 
      color: COLORS.borderLight 
    });
    
    y -= (descLines.length > 1 ? 26 : 20);  // Espacement augmenté
  }
  
  // === SECTION TOTAUX (alignée à droite) ===
  y -= 32;  // ✅ Remonté de 2 lignes : 60 - 28 = 32
  const totalsX = width - 250;  // ✅ Décalé vers la gauche : 220 -> 250 (30px)
  const totalsLabelWidth = 110;
  const totalsValueX = totalsX + totalsLabelWidth;
  
  // Mode HT + TVA : afficher sous-total et TVA
  if (data.pricingMode === 'HT_TVA') {
    page.drawText(`Sous-total HT:`, { x: totalsX, y, size: 10, font, color: textColor });
    page.drawText(`${data.subtotalHT.toFixed(2)} €`, { x: totalsValueX, y, size: 10, font, color: textColor });
    
    y -= 18;
    page.drawText(`TVA:`, { x: totalsX, y, size: 10, font, color: textColor });
    page.drawText(`${data.vatAmount.toFixed(2)} €`, { x: totalsValueX, y, size: 10, font, color: textColor });
    
    y -= 18;
  }
  
  // Remise éventuelle
  if (data.discountAmount && data.discountAmount > 0) {
    page.drawText(`Remise:`, { x: totalsX, y, size: 10, font, color: COLORS.success });
    page.drawText(`- ${data.discountAmount.toFixed(2)} €`, { x: totalsValueX, y, size: 10, font, color: COLORS.success });
    y -= 18;
  }
  
  // === BLOC TOTAL TTC (avec fond coloré) ===
  // Calculer hauteur du bloc total
  let totalBlockLines = 1; // TOTAL TTC
  if (data.paidAmount != null) totalBlockLines++; // Payé
  if (data.remainingAmount != null && data.remainingAmount > 0) totalBlockLines++; // Restant dû
  const totalBlockHeight = totalBlockLines * 22 + 8;
  
  // ✅ Descendre tout le bloc de 2 lignes (28px)
  const textOffset = 36; // 8 + 28 = 36 (descente de 2 lignes)
  
  // Fond bleu clair pour le bloc total
  page.drawRectangle({
    x: totalsX - 8,
    y: y - totalBlockHeight + 4 - 28,
    width: 210,
    height: totalBlockHeight,
    color: COLORS.primaryLight,
  });
  
  // Bordure gauche bleue (accent)
  page.drawRectangle({
    x: totalsX - 8,
    y: y - totalBlockHeight + 4 - 28,
    width: 3,
    height: totalBlockHeight,
    color: primaryColor,
  });
  
  // TOTAL TTC (plus grand et plus visible)
  page.drawText(`TOTAL TTC :`, { x: totalsX, y: y - textOffset, size: 13, font: fontBold, color: primaryColor });
  page.drawText(`${data.totalTTC.toFixed(2)} €`, { x: totalsValueX, y: y - textOffset, size: 13, font: fontBold, color: primaryColor });
  y -= 22;
  
  // Montant payé (si applicable)
  if (data.paidAmount != null) {
    page.drawText(`Payé :`, { x: totalsX, y: y - textOffset, size: 10, font, color: textColor });
    page.drawText(`${(data.paidAmount || 0).toFixed(2)} €`, { x: totalsValueX, y: y - textOffset, size: 10, font, color: textColor });
    y -= 22;
    
    // Restant dû (si positif)
    if (data.remainingAmount != null && data.remainingAmount > 0) {
      page.drawText(`Restant dû :`, { x: totalsX, y: y - textOffset, size: 11, font: fontBold, color: COLORS.danger });
      page.drawText(`${data.remainingAmount.toFixed(2)} €`, { x: totalsValueX, y: y - textOffset, size: 11, font: fontBold, color: COLORS.danger });
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
  y -= 76;  // ✅ Descendu de 4 lignes : 20 + 56 = 76
  if (y < 160) {
    // Nouvelle page si vraiment nécessaire (seuil abaissé : 200 → 160)
    page = pdfDoc.addPage([595, 842]);
    y = height - 80;
  }
  
  // Ligne de séparation
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: grayColor });
  y -= 12;  // ✅ Réduit : 15 → 12
  
  // Titre de la section
  page.drawText('CONDITIONS GÉNÉRALES', { x: 50, y, size: 8, font: fontBold, color: textColor });
  y -= 10;  // ✅ Réduit : 12 → 10
  
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
  
  // === FOOTER PROFESSIONNEL ===
  // Ajouter footer sur toutes les pages
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  pages.forEach((pg, index) => {
    const pageNum = index + 1;
    const { width: pgWidth } = pg.getSize();
    
    // Ligne de séparation en haut du footer
    pg.drawLine({
      start: { x: 50, y: 40 },
      end: { x: pgWidth - 50, y: 40 },
      thickness: 0.5,
      color: COLORS.border,
    });
    
    // Nom atelier à gauche
    pg.drawText(data.shopName, {
      x: 50,
      y: 25,
      size: 7,
      font,
      color: COLORS.textLight,
    });
    
    // Numéro de page au centre
    pg.drawText(`Page ${pageNum} / ${totalPages}`, {
      x: pgWidth / 2 - 25,
      y: 25,
      size: 7,
      font,
      color: COLORS.textLight,
    });
    
    // Document title + numéro à droite
    const docTitle = data.type === 'quote' ? 'Devis' : data.type === 'credit' ? 'Avoir' : 'Facture';
    const docNumber = formatDocumentNumber(data.number, data.type || 'invoice', data.issueDate);
    pg.drawText(`${docTitle} ${docNumber}`, {
      x: pgWidth - 150,
      y: 25,
      size: 7,
      font: fontBold,
      color: COLORS.textLight,
    });
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Wrap text to fit width - Support \n et wrapping intelligent
 */
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  
  // D'abord split par \n pour respecter les retours à la ligne explicites
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
  }
  
  return lines;
}
