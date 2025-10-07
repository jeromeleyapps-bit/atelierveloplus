import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { calculateSellingPrice, getPricingMargins } from "@/lib/pricing-margins";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const { workOrderId } = await req.json();
    
    if (!workOrderId) {
      return NextResponse.json(
        { error: "workOrderId is required" },
        { status: 400 }
      );
    }

    const invoiceId = params.id;

    // Récupérer le ticket avec ses pièces
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        parts: {
          include: {
            catalogItem: true,
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    // Récupérer la facture pour le taux horaire
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const createdLines = [];

    // Charger les marges une seule fois
    const margins = await getPricingMargins();

    // Déterminer le taux de TVA selon le mode de pricing
    const isAE = invoice.pricingMode === 'AE_TTC';
    const vatRate = isAE ? 0 : (invoice.vatRate || 20);

    // 1. Importer les pièces du ticket avec application des marges
    for (const part of workOrder.parts) {
      const purchasePriceHT = part.priceHT; // Prix d'achat fournisseur
      
      // Calculer le prix de vente avec marge
      const { sellingPriceHT } = await calculateSellingPrice(purchasePriceHT, margins);
      
      const unitPriceTTC = sellingPriceHT * (1 + vatRate / 100);
      const totalHT = sellingPriceHT * part.qty;
      const totalTTC = unitPriceTTC * part.qty;
      
      const line = await prisma.invoiceLine.create({
        data: {
          invoiceId,
          description: part.description || part.catalogItem?.name || "Pièce",
          qty: part.qty,
          unitPriceHT: sellingPriceHT, // Prix de vente avec marge
          unitPriceTTC: unitPriceTTC,
          totalHT: totalHT,
          totalTTC: totalTTC,
          vatRate: vatRate, // 0% si AE, 20% sinon
          purchasePriceHT: purchasePriceHT, // Stocker le prix d'achat pour référence
        },
      });
      createdLines.push(line);
    }

    // 2. Importer la main d'œuvre si estimatedMinutes existe
    if (workOrder.estimatedMinutes && workOrder.estimatedMinutes > 0) {
      const hourlyRate = workOrder.hourlyRate || invoice.laborRate || 60;
      const hours = workOrder.estimatedMinutes / 60;
      const unitPriceTTC = hourlyRate * (1 + vatRate / 100);
      const totalHT = hourlyRate * hours;
      const totalTTC = unitPriceTTC * hours;

      const laborLine = await prisma.invoiceLine.create({
        data: {
          invoiceId,
          description: `Main d'œuvre (${workOrder.estimatedMinutes} min)`,
          qty: hours,
          unitPriceHT: hourlyRate,
          unitPriceTTC: unitPriceTTC,
          totalHT: totalHT,
          totalTTC: totalTTC,
          vatRate: vatRate, // 0% si AE, 20% sinon
        },
      });
      createdLines.push(laborLine);
    }

    return NextResponse.json({
      success: true,
      lines: createdLines,
      message: `${createdLines.length} ligne(s) importée(s)`,
    });
  } catch (error: any) {
    console.error("Error importing labor to invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import labor" },
      { status: 500 }
    );
  }
}
