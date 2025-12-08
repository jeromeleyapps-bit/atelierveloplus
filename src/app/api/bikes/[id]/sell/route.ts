import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/jwt";
import { getIsAutoEntrepreneur } from "@/lib/api-helpers";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface AdditionalLine {
  description: string;
  quantity: number;
  unitPriceHT: number;
}

// POST /api/bikes/[id]/sell - Vendre vélo (génère Invoice)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bikeId } = await context.params;
    
    const user = await getUserFromToken(req);
    let userId = user?.userId;
    
    // Fallback: premier utilisateur actif
    if (!userId || userId === 'electron-local') {
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      userId = firstUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "no_user_found" }, { status: 404 });
    }

    const body = await req.json();
    const { customerId, type, discount, additionalLines } = body;

    // Validation
    if (!customerId) {
      return NextResponse.json(
        { error: 'missing_customer', message: 'Client requis' },
        { status: 400 }
      );
    }

    if (!type || !['INVOICE', 'QUOTE'].includes(type)) {
      return NextResponse.json(
        { error: 'invalid_type', message: 'Type doit être INVOICE ou QUOTE' },
        { status: 400 }
      );
    }

    // Charger vélo
    const bike = await prisma.bike.findUnique({
      where: { id: bikeId },
    });

    if (!bike) {
      return NextResponse.json({ error: 'bike_not_found' }, { status: 404 });
    }

    if (bike.stock < 1) {
      return NextResponse.json(
        { error: 'out_of_stock', message: 'Vélo non disponible (stock: 0)' },
        { status: 400 }
      );
    }

    // Vérifier client existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
    }

    // Récupérer statut Auto-Entrepreneur
    const isAutoEntrepreneur = await getIsAutoEntrepreneur(userId);
    const vatRate = isAutoEntrepreneur ? 0 : bike.vatRate;

    // Calculer prix ligne vélo
    const bikePriceHT = bike.sellingPriceHT;
    let bikeTotalHT = bikePriceHT;

    // Appliquer remise si fournie
    if (discount && discount > 0) {
      const discountAmount = bikePriceHT * (discount / 100);
      bikeTotalHT = bikePriceHT - discountAmount;
    }

    const bikeTVA = bikeTotalHT * vatRate;
    const bikeTotalTTC = bikeTotalHT + bikeTVA;

    // Créer lignes invoice
    const invoiceLines = [];
    let totalHT = bikeTotalHT;
    let totalTVA = bikeTVA;

    // Ligne 1 : Vélo
    const bikeDescription = `${bike.brand} ${bike.model} (${bike.year})
Taille: ${bike.size}${bike.color ? ` - Couleur: ${bike.color}` : ''}
État: ${bike.condition === 'NEW' ? 'Neuf' : 'Occasion'}${bike.serialNumber ? `\nN° Série: ${bike.serialNumber}` : ''}`;

    invoiceLines.push({
      index: 0,
      description: bikeDescription,
      quantity: 1,
      unitPriceHT: bikePriceHT,
      vatRate,
      discount: discount || 0,
      totalHT: bikeTotalHT,
      totalTTC: bikeTotalTTC,
    });

    // Lignes additionnelles (accessoires, montage...)
    if (additionalLines && Array.isArray(additionalLines)) {
      additionalLines.forEach((line: AdditionalLine, idx: number) => {
        const lineHT = line.quantity * line.unitPriceHT;
        const lineTVA = lineHT * vatRate;
        const lineTTC = lineHT + lineTVA;

        totalHT += lineHT;
        totalTVA += lineTVA;

        invoiceLines.push({
          index: idx + 1,
          description: line.description,
          quantity: line.quantity,
          unitPriceHT: line.unitPriceHT,
          vatRate,
          discount: 0,
          totalHT: lineHT,
          totalTTC: lineTTC,
        });
      });
    }

    const totalTTC = totalHT + totalTVA;

    // Générer numéro invoice
    const prefix = type === 'INVOICE' ? 'FAC' : 'DEV';
    const year = new Date().getFullYear();
    
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        number: { startsWith: `${prefix}-${year}-` }
      },
      orderBy: { number: 'desc' }
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const match = lastInvoice.number.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Créer Invoice
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        type: type === 'INVOICE' ? 'invoice' : 'quote',
        status: type === 'INVOICE' ? 'paid' : 'draft',
        customerId,
        // Champs schema Invoice : subtotalHT, vatAmount, totalTTC
        subtotalHT: totalHT,
        vatAmount: totalTVA,
        totalTTC,
        issueDate: type === 'INVOICE' ? new Date() : null,
        dueDate: type === 'INVOICE' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // +30j
        InvoiceLine: { create: invoiceLines },
      },
      include: { InvoiceLine: true },
    });

    // Si FACTURE (pas devis), décrémenter stock vélo
    if (type === 'INVOICE') {
      await prisma.bike.update({
        where: { id: bikeId },
        data: { stock: { decrement: 1 } },
      });
    }

    return NextResponse.json({
      success: true,
      invoice,
      message: type === 'INVOICE' ? 'Vélo vendu avec succès' : 'Devis créé avec succès',
    });

  } catch (error) {
    const { id } = await context.params;
    logger.error(`[POST /api/bikes/${id}/sell] Error:`, error);
    const message = error instanceof Error ? error.message : 'sale_failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
