import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSellingPrice, getPricingMargins } from "@/lib/pricing-margins";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Removed getPrisma() - using direct import
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

    const invoiceId = id;

    // Récupérer le ticket avec ses lignes (pièces + services)
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { WorkOrderLine: true,
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
    const parts = workOrder.WorkOrderLine.filter(line => line.type === 'part');
    for (const part of parts) {
      const purchasePriceHT = part.priceHT; // Prix d'achat fournisseur
      
      // Calculer le prix de vente avec marge
      const { sellingPriceHT } = await calculateSellingPrice(purchasePriceHT, margins);
      
      const unitPriceTTC = sellingPriceHT * (1 + vatRate / 100);
      const totalHT = sellingPriceHT * part.quantity;
      const totalTTC = unitPriceTTC * part.quantity;
      
      const line = await prisma.invoiceLine.create({
        data: {
          invoiceId,
          description: part.description || "Pièce",
          qty: part.quantity,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import labor";
    logger.error("Error importing labor to invoice", { error: message });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
