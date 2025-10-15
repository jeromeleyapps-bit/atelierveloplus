import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/finance/quotes
 * Create a new quote (devis) for a work order
 */
export async function POST(req: Request) {
  const prisma = await getPrisma();
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

    // Check if user is auto-entrepreneur
    const aeSetting = await prisma.globalSetting.findUnique({
      where: { key: "autoEntrepreneur" },
    });
    const isAE = aeSetting?.value === "true";

    // Get work order lines to copy
    const workOrderLines = await prisma.workOrderLine.findMany({
      where: { workOrderId },
    });

    // Create the quote
    const quote = await prisma.invoice.create({
      data: {
        workOrderId,
        type: "quote",
        status: "draft",
        validUntil,
        // Default values - TVA 0% si auto-entrepreneur
        pricingMode: isAE ? "AE_TTC" : "HT_TVA",
        currency: "EUR",
        vatRate: isAE ? 0 : 20,
        laborRate: 60,
        subtotalHT: 0,
        vatAmount: 0,
        totalTTC: 0,
        // Copy lines from work order
        lines: {
          create: workOrderLines.map(line => ({
            type: line.type,
            description: line.description,
            qty: line.qty || 1,
            unitPriceHT: line.unitPriceHT || 0,
            vatRate: line.vatRate || (isAE ? 0 : 20),
            sourceId: line.sourceId,
            notes: line.notes,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error: any) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: "Failed to create quote", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finance/quotes
 * List all quotes
 */
export async function GET(req: Request) {
  const prisma = await getPrisma();
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

    const where: any = { type: "quote" };
    if (status) where.status = status;
    if (workOrderId) where.workOrderId = workOrderId;

    const quotes = await prisma.invoice.findMany({
      where,
      include: {
        lines: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes", details: error.message },
      { status: 500 }
    );
  }
}
