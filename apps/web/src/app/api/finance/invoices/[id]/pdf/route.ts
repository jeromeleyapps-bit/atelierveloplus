import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf-invoice";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

/**
 * Build invoice data object from Prisma invoice + settings
 */
function buildInvoiceData(inv: any, customer: any, settings: any) {
  const s = settings || {};
  
  return {
    number: inv.number || inv.id,
    issueDate: inv.issueDate || inv.createdAt,
    dueDate: inv.dueDate,
    status: inv.status,
    type: inv.type || 'invoice', // Type de document
    
    // Shop info
    shopName: s.shopName || process.env.SHOP_NAME || 'Atelier Vélo+',
    shopAddress: s.address1 || process.env.SHOP_ADDRESS1 || '',
    shopZip: s.zip || process.env.SHOP_ZIP || '',
    shopCity: s.city || process.env.SHOP_CITY || '',
    shopPhone: s.shopPhone || process.env.SHOP_PHONE,
    shopEmail: s.shopEmail || process.env.SHOP_EMAIL,
    shopSiret: process.env.SHOP_SIRET,
    shopTVA: process.env.SHOP_TVA,
    
    // Customer info
    customerName: customer 
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || customer.id
      : 'Client',
    customerAddress: customer?.address1,
    customerZip: customer?.zip,
    customerCity: customer?.city,
    
    // Lines
    lines: (inv.lines || []).map((ln: any) => ({
      description: ln.description,
      qty: ln.qty,
      unitPriceHT: ln.unitPriceHT,
      unitPriceTTC: ln.unitPriceTTC,
      vatRate: ln.vatRate,
      totalHT: ln.totalHT,
      totalTTC: ln.totalTTC,
    })),
    
    // Totals
    subtotalHT: inv.subtotalHT,
    vatAmount: inv.vatAmount,
    totalTTC: inv.totalTTC,
    pricingMode: inv.pricingMode,
    
    // Payment
    paymentMethod: inv.paymentMethod,
    paidAt: inv.paidAt,
    
    // Legal
    legalFooter: s.legalFooter || process.env.LEGAL_FOOTER,
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });
  
  if (!inv) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });

  // Get customer via WorkOrder
  let customer: any = null;
  if (inv.workOrderId) {
    const wo = await prisma.workOrder.findUnique({ where: { id: inv.workOrderId } });
    if (wo?.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: wo.customerId } });
    }
  }
  
  // Get user settings
  const userId = getUserId(req);
  const settings = userId ? await prisma.appSetting.findUnique({ where: { userId } }) : null;

  // Build invoice data
  const invoiceData: any = buildInvoiceData(inv, customer, settings);
  // Discount and partial payments
  let paidAmount = 0;
  let payments: Array<{ amount: number; method?: string | null; paidAt: string; note?: string | null }> = [];
  try {
    const pays = await prisma.invoicePayment.findMany({ where: { invoiceId: inv.id }, orderBy: { paidAt: "asc" } });
    payments = pays.map((p: any) => ({ amount: p.amount || 0, method: p.method || null, paidAt: p.paidAt?.toISOString?.() || p.paidAt, note: p.note || null }));
    paidAmount = pays.reduce((s, p) => s + (p.amount || 0), 0);
  } catch {}
  const remainingAmount = Math.max(0, (inv.totalTTC || 0) - paidAmount);
  invoiceData.discountAmount = inv.discountAmount || 0;
  invoiceData.paidAmount = paidAmount;
  invoiceData.remainingAmount = remainingAmount;
  invoiceData.payments = payments;

  // Optional logo: fetch from env SHOP_LOGO_URL if provided and looks like http(s)
  const logoUrl = process.env.SHOP_LOGO_URL;
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    try {
      const resp = await fetch(logoUrl, { cache: 'no-store' });
      if (resp.ok) {
        const arr = new Uint8Array(await resp.arrayBuffer());
        (invoiceData as any).logoBytes = arr;
      }
    } catch {}
  }
  
  // Generate PDF
  const pdfBytes = await generateInvoicePDF(invoiceData);
  
  // Nom du fichier selon le type
  const docType = inv.type === 'quote' ? 'devis' : inv.type === 'credit' ? 'avoir' : 'facture';
  // Utiliser le numéro si disponible, sinon format court avec date
  const identifier = inv.number || `brouillon_${new Date(inv.createdAt).toISOString().slice(0, 10)}`;
  const filename = `${docType}_${identifier}.pdf`;
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
