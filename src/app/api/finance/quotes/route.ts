import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recomputeTotals } from "@/lib/invoice-totals";
import { calculateLaborCost } from "@/lib/labor-pricing";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * POST /api/finance/quotes
 * Create a new quote (devis) for a work order
 */
export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { workOrderId, validDays = 30 } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { error: "workOrderId is required" },
        { status: 400 }
      );
    }

    // Check if work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    // Calculate valid until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // Get work order lines to copy
    const workOrderLines = await prisma.workOrderLine.findMany({
      where: { workOrderId },
    });

    // Vérifier statut Auto-Entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();
    
    // Default VAT rate from body or 20% (0 si AE)
    const defaultVatRate = isAutoEntrepreneur ? 0 : (body.vatRate != null ? Number(body.vatRate) : 20);
    const laborVatRate = isAutoEntrepreneur ? 0 : 10; // 10% pour prestations de réparation (0 si AE)

    // Calculer le coût de la main d'œuvre (facturation par tranches de 30 min)
    const { hourlyRate, laborCostHT } = await calculateLaborCost(
      workOrder.estimatedMinutes,
      workOrder.hourlyRate
    );

    // Préparer les lignes du devis
    const quoteLines: Prisma.InvoiceLineCreateWithoutInvoiceInput[] = [];

    // Ajouter ligne main d'œuvre si présente
    if (laborCostHT > 0) {
      quoteLines.push({
        type: "labor",
        description: `Main d'œuvre - ${workOrder.estimatedMinutes} minutes`,
        qty: 1,
        unitPriceHT: laborCostHT,
        vatRate: laborVatRate,
      });
    }

    // Ajouter lignes pièces
    quoteLines.push(...workOrderLines.map(line => ({
      type: line.type,
      description: line.description,
      qty: line.quantity || 1,
      unitPriceHT: line.priceHT || 0,
      vatRate: line.vatRate != null ? line.vatRate : defaultVatRate,
    })));

    // Create the quote
    const quote = await prisma.invoice.create({
      data: {
        workOrderId,
        type: "quote",
        status: "draft",
        validUntil,
        // Default values (AE_TTC si auto-entrepreneur)
        pricingMode: isAutoEntrepreneur ? "AE_TTC" : "HT_TVA",
        currency: "EUR",
        vatRate: defaultVatRate,
        laborRate: hourlyRate,
        subtotalHT: 0,
        vatAmount: 0,
        totalTTC: 0,
        // Créer toutes les lignes (main d'œuvre + pièces)
        InvoiceLine: { create: quoteLines },
      },
      include: { InvoiceLine: true },
    });

    // Recalculer les totaux si des lignes ont été créées
    if (quoteLines.length > 0) {
      const totals = recomputeTotals({
        id: quote.id,
        pricingMode: quote.pricingMode,
        vatRate: quote.vatRate,
        discountAmount: quote.discountAmount || 0,
        lines: quote.InvoiceLine.map(l => ({
          id: l.id,
          type: l.type,
          qty: l.qty,
          unitPriceHT: l.unitPriceHT,
          unitPriceTTC: l.unitPriceTTC,
          vatRate: l.vatRate
        }))
      });
      
      await prisma.invoice.update({
        where: { id: quote.id },
        data: totals
      });
      
      // Recharger le devis avec les totaux mis à jour
      const updatedQuote = await prisma.invoice.findUnique({
        where: { id: quote.id },
        include: { InvoiceLine: true },
      });
      
      return NextResponse.json(updatedQuote, { status: 201 });
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    logger.error("Error creating quote:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create quote", details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finance/quotes
 * List all quotes
 */
export async function GET(req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const workOrderId = searchParams.get("workOrderId");

    const where: Prisma.InvoiceWhereInput = { type: "quote" };
    if (status) where.status = status;
    if (workOrderId) where.workOrderId = workOrderId;

    const quotes = await prisma.invoice.findMany({
      where,
      include: { InvoiceLine: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    logger.error("Error fetching quotes:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch quotes", details: message },
      { status: 500 }
    );
  }
}
