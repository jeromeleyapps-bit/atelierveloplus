import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface WorkOrder {
  id: string;
  customerId: string | null;
}

// GET /api/finance/invoices
export async function GET(req: Request) {
  try {
    // Vérifier que Prisma est disponible
    if (!prisma) {
      logger.error("[Invoices GET] Prisma not available");
      return NextResponse.json(
        { error: "database_unavailable", message: "Base de données non disponible" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q");

    const where: Prisma.InvoiceWhereInput = {};
    if (status) where.status = status;
    if (from || to) where.issueDate = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    // SQLite ne supporte pas mode: 'insensitive', on utilise contains sans mode
    if (q) where.OR = [{ number: { contains: q } }, { workOrderId: { contains: q } }, { id: { contains: q } }];

    const items = await prisma.invoice.findMany({ where, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }] });
    
    // Enrich with customer info - Collecter customerIds depuis Invoice ET WorkOrder
    const directCustIds = items.map(i => i.customerId).filter(Boolean) as string[];
    const woIds = items.map(i => i.workOrderId).filter(Boolean) as string[];
    
    const custMap = new Map<string, Customer>();
    
    // 1. Charger customers directs (invoices.customerId)
    if (directCustIds.length > 0) {
      const directCustomers = await prisma.customer.findMany({ where: { id: { in: directCustIds } } }) as Customer[];
      directCustomers.forEach(c => custMap.set(c.id, c));
    }
    
    // 2. Charger customers depuis WorkOrders
    const woMap = new Map<string, WorkOrder>();
    if (woIds.length > 0) {
      const workOrders = await prisma.workOrder.findMany({ where: { id: { in: woIds } } }) as WorkOrder[];
      workOrders.forEach(w => woMap.set(w.id, w));
      
      const woCustIds = workOrders.map(w => w.customerId).filter(Boolean) as string[];
      if (woCustIds.length > 0) {
        const woCustomers = await prisma.customer.findMany({ where: { id: { in: woCustIds } } }) as Customer[];
        woCustomers.forEach(c => custMap.set(c.id, c));
      }
    }
    
    // 3. Enrichir avec customerName
    const out = items.map(i => {
      let custId = i.customerId;
      // Si pas de customerId direct, chercher via WorkOrder
      if (!custId && i.workOrderId) {
        const wo = woMap.get(i.workOrderId);
        custId = wo?.customerId || null;
      }
      
      const c = custId ? custMap.get(custId) : undefined;
      const customerName = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || (c.email || '') : undefined;
      
      return { ...i, customerId: custId, customerName };
    });
    
    return NextResponse.json(out, { status: 200 });
  } catch (error) {
    logger.error('[API /finance/invoices GET] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error('[API /finance/invoices GET] Error code:', error.code);
      logger.error('[API /finance/invoices GET] Error meta:', error.meta);
      return NextResponse.json({ error: error.message, code: error.code, meta: error.meta }, { status: 500 });
    }
    const message = error instanceof Error ? error.message : 'fetch_error';
    logger.error('[API /finance/invoices GET] Full error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/finance/invoices
export async function POST(req: Request) {
  const body = await req.json();
  const {
    workOrderId,
    customerId,
    pricingMode = "HT_TVA",
    currency = "EUR",
    vatRate = pricingMode === "AE_TTC" ? 0 : 20,
    laborRate = 60,
  } = body || {};
  
  try {
    // 0. Récupérer le statut auto-entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur();
    logger.info(`[POST Invoice] Statut Auto-Entrepreneur: ${isAutoEntrepreneur}`);
    
    // Ajuster pricingMode et vatRate selon le statut AE
    const finalPricingMode = isAutoEntrepreneur ? "AE_TTC" : pricingMode;
    const finalVatRate = isAutoEntrepreneur ? 0 : vatRate;
    
    // Si workOrderId fourni, récupérer le customerId depuis WorkOrder
    let finalCustomerId = customerId || null;
    if (workOrderId && !finalCustomerId) {
      const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
      if (wo?.customerId) {
        finalCustomerId = wo.customerId;
      }
    }
    
    logger.info(`[POST Invoice] workOrderId: ${workOrderId}, customerId: ${finalCustomerId}`);
    
    // 1. Créer la facture vide
    const inv = await prisma.invoice.create({
      data: {
        workOrderId: workOrderId || null,
        customerId: finalCustomerId,
        type: "invoice", // Type par défaut: facture
        pricingMode: finalPricingMode,
        currency,
        vatRate: finalVatRate,
        laborRate,
        status: "draft",
        subtotalHT: 0,
        vatAmount: 0,
        totalTTC: 0,
      },
    });
    
    // 2. Si workOrderId fourni, copier les lignes du WorkOrder vers la facture
    if (workOrderId) {
      const workOrderLines = await prisma.workOrderLine.findMany({
        where: { workOrderId },
      });
      
      logger.info(`[POST Invoice] Copie de ${workOrderLines.length} lignes depuis WorkOrder ${workOrderId}`);
      
      if (workOrderLines.length > 0) {
        // Créer les lignes de facture
        await prisma.invoiceLine.createMany({
          data: workOrderLines.map(line => ({
            invoiceId: inv.id,
            type: line.type,
            description: line.description,
            qty: line.quantity,
            unitPriceHT: line.priceHT,
            unitPriceTTC: isAutoEntrepreneur 
              ? line.priceHT  // AE: TTC = HT (prix unitaire)
              : line.priceHT * (1 + line.vatRate / 100), // Standard: TTC = HT + TVA (prix unitaire)
            vatRate: isAutoEntrepreneur ? 0 : line.vatRate, // Force 0 si AE
            totalHT: line.quantity * line.priceHT,
            totalTTC: isAutoEntrepreneur 
              ? line.quantity * line.priceHT  // AE: TTC = HT (total ligne)
              : line.quantity * line.priceHT * (1 + line.vatRate / 100), // Standard: TTC = HT + TVA (total ligne)
            partId: line.sourceId,
          })),
        });
        
        // Recalculer les totaux de la facture
        const subtotalHT = workOrderLines.reduce((sum, line) => sum + (line.quantity * line.priceHT), 0);
        const vatAmount = isAutoEntrepreneur 
          ? 0  // AE: Pas de TVA
          : workOrderLines.reduce((sum, line) => sum + (line.quantity * line.priceHT * line.vatRate / 100), 0);
        const totalTTC = subtotalHT + vatAmount;
        
        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            subtotalHT,
            vatAmount,
            totalTTC,
          },
        });
        
        logger.info(`[POST Invoice] Totaux calculés (AE=${isAutoEntrepreneur}): HT=${subtotalHT}€, TVA=${vatAmount}€, TTC=${totalTTC}€`);
      }
    }
    
    return NextResponse.json(inv, { status: 201 });
  } catch (error) {
    logger.error('[POST Invoice] Error:', error);
    const message = error instanceof Error ? error.message : 'create_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
