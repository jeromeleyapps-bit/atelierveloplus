import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/finance/invoices/:id/convert-to-invoice
 * Converts a quote to an invoice
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  const quoteId = params.id;

  try {
    // Get the quote
    const quote = await prisma.invoice.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.type !== "quote") {
      return NextResponse.json(
        { error: "Only quotes can be converted to invoices" },
        { status: 400 }
      );
    }

    if (quote.convertedAt) {
      return NextResponse.json(
        { error: "Quote already converted", convertedToId: quote.convertedToId },
        { status: 400 }
      );
    }

    // Create the invoice from the quote
    const invoice = await prisma.invoice.create({
      data: {
        workOrderId: quote.workOrderId,
        type: "invoice",
        status: "draft",
        parentId: quoteId, // Link back to the quote
        pricingMode: quote.pricingMode,
        currency: quote.currency,
        vatRate: quote.vatRate,
        laborRate: quote.laborRate,
        subtotalHT: quote.subtotalHT,
        vatAmount: quote.vatAmount,
        totalTTC: quote.totalTTC,
        discountAmount: quote.discountAmount,
        // Copy all lines
        lines: {
          create: quote.lines.map((line) => ({
            type: line.type,
            description: line.description,
            qty: line.qty,
            unitPriceHT: line.unitPriceHT,
            unitPriceTTC: line.unitPriceTTC,
            vatRate: line.vatRate,
            totalHT: line.totalHT,
            totalTTC: line.totalTTC,
            partId: line.partId,
            purchasePriceHT: line.purchasePriceHT,
          })),
        },
      },
      include: { lines: true },
    });

    // Mark the quote as converted
    await prisma.invoice.update({
      where: { id: quoteId },
      data: {
        convertedAt: new Date(),
        convertedToId: invoice.id,
        status: "converted", // Optional: mark quote as converted
      },
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: "Quote converted to invoice successfully",
    });
  } catch (error: any) {
    console.error("Error converting quote to invoice:", error);
    return NextResponse.json(
      { error: "Failed to convert quote", details: error.message },
      { status: 500 }
    );
  }
}
