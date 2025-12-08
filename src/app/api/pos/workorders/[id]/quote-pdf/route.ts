import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf-invoice";
import { getUserSettings } from "@/lib/api-helpers";
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/pos/workorders/[id]/quote-pdf
 * Génère un PDF de devis à partir d'un ordre de réparation
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const { id } = await context.params;

    // Récupérer les paramètres utilisateur
    const userSettings = await getUserSettings();

    const isAutoEntrepreneur = userSettings?.isAutoEntrepreneur || false;

    // Récupérer le workorder avec ses pièces
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { WorkOrderLine: true,
        Customer: true,
        CustomerBike: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Ordre de réparation non trouvé" },
        { status: 404 },
      );
    }

    // Calculer le coût de la main d'œuvre
    const laborCostHT =
      workOrder.estimatedMinutes && workOrder.hourlyRate
        ? (workOrder.estimatedMinutes / 60) * workOrder.hourlyRate
        : 0;

    // Calculer le coût des pièces et TVA
    let partsCostHT = 0;
    let partsTVA = 0;
    for (const line of workOrder.WorkOrderLine) {
      const lineHT = line.priceHT * line.quantity;
      const lineTVA = lineHT * (line.vatRate / 100);
      partsCostHT += lineHT;
      partsTVA += lineTVA;
    }

    // TVA main d'œuvre (0% si AE, sinon 10%)
    const laborTvaRate = isAutoEntrepreneur ? 0 : 10;
    const laborTVA = laborCostHT * (laborTvaRate / 100);

    // Totaux
    const totalHT = laborCostHT + partsCostHT;
    const totalTVA = laborTVA + partsTVA;
    const totalTTC = totalHT + totalTVA;

    logger.info("[QUOTE-PDF] Calculs:", {
      laborCostHT,
      partsCostHT,
      totalHT,
      laborTVA,
      partsTVA,
      totalTVA,
      totalTTC,
      isAutoEntrepreneur,
    });

    // Construire les lignes
    const lines = [];

    // Ligne main d'œuvre
    if (laborCostHT > 0) {
      lines.push({
        description: `Main d'œuvre - ${workOrder.estimatedMinutes} minutes`,
        qty: 1,
        unitPriceHT: laborCostHT,
        unitPriceTTC: laborCostHT * (1 + laborTvaRate / 100),
        vatRate: laborTvaRate,
        totalHT: laborCostHT,
        totalTTC: laborCostHT * (1 + laborTvaRate / 100),
      });
    }

    // Lignes pièces
    for (const line of workOrder.WorkOrderLine) {
      const lineVatRate = line.vatRate ?? 0;
      lines.push({
        description: line.description,
        qty: line.quantity,
        unitPriceHT: line.priceHT,
        unitPriceTTC: line.priceHT * (1 + lineVatRate / 100),
        vatRate: lineVatRate,
        totalHT: line.priceHT * line.quantity,
        totalTTC: line.priceHT * line.quantity * (1 + lineVatRate / 100),
      });
    }

    // Préparer les données pour le PDF
    const invoiceData = {
      number: `DEVIS-${workOrder.id.slice(-8)}`,
      issueDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
      status: "draft",
      type: "quote",

      // Shop info
      shopName: userSettings?.shopName || "Atelier Vélo+",
      shopLogo: userSettings?.shopLogo || null, // Logo uploadé
      shopAddress: userSettings?.address1 || "123 Rue du Vélo",
      shopZip: userSettings?.zip || "75000",
      shopCity: userSettings?.city || "Paris",
      shopPhone: userSettings?.shopPhone || "01 23 45 67 89",
      shopEmail: userSettings?.shopEmail || "contact@atelier-velo.fr",
      shopSiret: userSettings?.siret || "",
      shopTVA: userSettings?.tva || "",
      shopRCS: userSettings?.rcs || "",
      shopCapital: userSettings?.capital || "",
      shopInsurance: userSettings?.insurance || "",

      // Customer info
      customerName: workOrder.Customer
        ? `${workOrder.Customer.firstName || ""} ${workOrder.Customer.lastName || ""}`.trim()
        : "Client",
      customerAddress: workOrder.Customer?.address1 || "",
      customerZip: workOrder.Customer?.zip || "",
      customerCity: workOrder.Customer?.city || "",

      // Lines
      lines,

      // Totals
      subtotalHT: totalHT,
      vatAmount: totalTVA,
      totalTTC,
      pricingMode: isAutoEntrepreneur ? ("AE_TTC" as const) : ("HT_TVA" as const),

      // Legal
      legalFooter: userSettings?.legalFooter || "",
    };

    // Charger le logo - PRIORITÉS: uploadé > fallback
    let logoLoaded = false;
    
    // PRIORITÉ 1: Logo uploadé
    if (invoiceData.shopLogo && typeof invoiceData.shopLogo === 'string') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        const relativePath = invoiceData.shopLogo.startsWith('/') 
          ? invoiceData.shopLogo.slice(1) 
          : invoiceData.shopLogo;
        
        const fullPath = path.join(process.cwd(), 'public', relativePath);
        
        if (fs.existsSync(fullPath)) {
          const buf = fs.readFileSync(fullPath);
          (invoiceData as { logoBytes?: Uint8Array }).logoBytes = new Uint8Array(buf);
          logoLoaded = true;
          logger.info('[QUOTE-PDF] Logo uploadé chargé', { fullPath });
        }
      } catch (e) {
        logger.error('[QUOTE-PDF] Erreur chargement logo uploadé:', e);
      }
    }
    
    // PRIORITÉ 2: Fallback logo.png
    if (!logoLoaded) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        
        if (fs.existsSync(logoPath)) {
          const buf = fs.readFileSync(logoPath);
          (invoiceData as { logoBytes?: Uint8Array }).logoBytes = new Uint8Array(buf);
          logoLoaded = true;
          logger.info('[QUOTE-PDF] Logo fallback chargé');
        }
      } catch (e) {
        logger.error('[QUOTE-PDF] Erreur fallback logo.png:', e);
      }
    }
    
    if (!logoLoaded) {
      logger.warn('[QUOTE-PDF] Aucun logo chargé - cadre fallback sera affiché');
    }

    // Générer le PDF
    const pdfBytes = await generateInvoicePDF(invoiceData);

    // Nom fichier: devis-YYYYMMDD-xxxxx.pdf (date + 5 chars ID)
    const dateStr = new Date(workOrder.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = workOrder.id.slice(-5);
    const filename = `devis-${dateStr}-${shortId}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("[API] Error generating quote PDF:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 },
    );
  }
}
