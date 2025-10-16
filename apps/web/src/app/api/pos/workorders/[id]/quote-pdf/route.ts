import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf-invoice";

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
  try {
    const { id } = await context.params;

    // Récupérer les paramètres utilisateur
    const userSettings = await prisma.appSetting.findFirst({
      select: {
        shopName: true,
        shopEmail: true,
        shopPhone: true,
        address1: true,
        address2: true,
        zip: true,
        city: true,
        country: true,
        siret: true,
        tva: true,
        rcs: true,
        capital: true,
        insurance: true,
        legalFooter: true,
        isAutoEntrepreneur: true,
      },
    });

    const isAutoEntrepreneur = userSettings?.isAutoEntrepreneur || false;

    // Récupérer le workorder avec ses pièces
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        lines: true,
        customer: true,
        bike: true,
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
    for (const line of workOrder.lines) {
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

    console.log("[QUOTE-PDF] Calculs:", {
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
    for (const line of workOrder.lines) {
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
      customerName: workOrder.customer
        ? `${workOrder.customer.firstName || ""} ${workOrder.customer.lastName || ""}`.trim()
        : "Client",
      customerAddress: workOrder.customer?.address1 || "",
      customerZip: workOrder.customer?.zip || "",
      customerCity: workOrder.customer?.city || "",

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

    // Charger le logo
    try {
      const origin = new URL(request.url).origin;
      const logoUrl = `${origin}/logo.png`;
      const resp = await fetch(logoUrl, { cache: "no-store" });
      if (resp.ok) {
        const arr = new Uint8Array(await resp.arrayBuffer());
        (invoiceData as any).logoBytes = arr;
      }
    } catch (error) {
      console.log("Logo non chargé:", error);
    }

    // Générer le PDF
    const pdfBytes = await generateInvoicePDF(invoiceData);

    const filename = `devis_${workOrder.id.slice(-8)}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API] Error generating quote PDF:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 },
    );
  }
}
