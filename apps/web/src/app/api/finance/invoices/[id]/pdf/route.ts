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
    validUntil: inv.validUntil, // Pour les devis
    parentId: inv.parentId, // Pour les avoirs
    
    // Shop info (priorité : profil utilisateur > variables d'environnement > valeurs par défaut)
    shopName: s.shopName || process.env.SHOP_NAME || 'Atelier Vélo+',
    shopAddress: s.address1 || process.env.SHOP_ADDRESS1 || '123 Rue du Vélo',
    shopZip: s.zip || process.env.SHOP_ZIP || '75000',
    shopCity: s.city || process.env.SHOP_CITY || 'Paris',
    shopPhone: s.shopPhone || process.env.SHOP_PHONE || '01 23 45 67 89',
    shopEmail: s.shopEmail || process.env.SHOP_EMAIL || 'contact@atelier-velo.fr',
    
    // Informations légales (priorité : profil utilisateur > variables d'environnement)
    shopSiret: (s as any).siret || process.env.SHOP_SIRET || '',
    shopTVA: (s as any).tva || process.env.SHOP_TVA || '',
    shopRCS: (s as any).rcs || process.env.SHOP_RCS || '',
    shopCapital: (s as any).capital || process.env.SHOP_CAPITAL || '',
    shopInsurance: (s as any).insurance || process.env.SHOP_INSURANCE || '',
    
    // Customer info
    customerName: customer 
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || customer.id
      : 'Client',
    customerAddress: customer?.address1,
    customerZip: customer?.zip,
    customerCity: customer?.city,
    
    // Lines with computed totals fallback
    lines: (inv.lines || []).map((ln: any) => {
      const qty = ln.qty ?? 1;
      const vr = (ln.vatRate ?? inv.vatRate) || 0;
      let totalHT = ln.totalHT;
      let totalTTC = ln.totalTTC;
      if (totalHT == null || totalTTC == null) {
        if (inv.pricingMode === 'HT_TVA') {
          const uht = ln.unitPriceHT ?? 0;
          totalHT = uht * qty;
          totalTTC = totalHT * (1 + vr / 100);
        } else {
          const uttc = ln.unitPriceTTC ?? 0;
          totalTTC = uttc * qty;
          // derive HT for completeness
          totalHT = vr > 0 ? totalTTC / (1 + vr / 100) : totalTTC;
        }
      }
      return {
        description: ln.description,
        qty,
        unitPriceHT: ln.unitPriceHT,
        unitPriceTTC: ln.unitPriceTTC,
        vatRate: ln.vatRate,
        totalHT,
        totalTTC,
      };
    }),
    
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
  let userId = getUserId(req);
  
  // Si pas d'userId, utiliser le premier utilisateur
  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) userId = firstUser.id;
  }
  
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

  // Optional logo: prefer env SHOP_LOGO_URL; fallback to local public/logo.png
  const logoUrl = process.env.SHOP_LOGO_URL;
  async function tryLoadLogoFromUrl(url: string) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (resp.ok) {
        const arr = new Uint8Array(await resp.arrayBuffer());
        (invoiceData as any).logoBytes = arr;
        return true;
      }
    } catch {}
    return false;
  }
  let logoLoaded = false;
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    logoLoaded = await tryLoadLogoFromUrl(logoUrl);
  }
  if (!logoLoaded) {
    try {
      // In Next.js app route, we can fetch the same host's public asset via absolute path
      const origin = new URL(req.url).origin;
      const localUrl = `${origin}/logo.png`;
      logoLoaded = await tryLoadLogoFromUrl(localUrl);
    } catch {}
  }
  if (!logoLoaded) {
    // Filesystem fallbacks: packaged Electron (resources), then local dev
    try {
      const fs = await import('fs');
      const path = await import('path');
      const resPath = process.env.RESOURCES_PATH;
      if (resPath) {
        const p = path.join(resPath, 'web', 'public', 'logo.png');
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          (invoiceData as any).logoBytes = new Uint8Array(buf);
          logoLoaded = true;
        }
      }
      if (!logoLoaded) {
        const p2 = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(p2)) {
          const buf = fs.readFileSync(p2);
          (invoiceData as any).logoBytes = new Uint8Array(buf);
          logoLoaded = true;
        }
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
