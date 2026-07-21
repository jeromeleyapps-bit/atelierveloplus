import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF, type InvoiceData as PdfInvoiceData } from "@/lib/pdf-invoice";
import { getUserIdOrFirst } from "@/lib/api-helpers";
import { isFreeTier } from "@/lib/free-tier-guards";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// ======= TYPES =======
interface InvoiceFromDB {
  id: string;
  workOrderId: string | null;
  customerId?: string | null;
  number: string | null;
  issueDate: Date | null;
  status: string;
  type: string;
  parentId: string | null;
  pricingMode: string;
  currency: string;
  vatRate: number;
  laborRate: number;
  subtotalHT: number;
  vatAmount: number;
  totalTTC: number;
  discountAmount: number | null;
  paidAt: Date | null;
  paymentMethod: string | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  dueDate: Date | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  validUntil: Date | null;
  convertedAt: Date | null;
  convertedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
  InvoiceLine?: InvoiceLineFromDB[];
}

interface InvoiceLineFromDB {
  id: string;
  invoiceId: string;
  type: string;
  description: string;
  qty: number;
  unitPriceHT: number | null;
  unitPriceTTC: number | null;
  vatRate: number | null;
  totalHT: number;
  totalTTC: number;
  partId: string | null;
  purchasePriceHT: number | null;
}

interface CustomerFromDB {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  zip: string | null;
  city: string | null;
}

interface AppSettingFromDB {
  id: string;
  userId: string;
  shopName: string | null;
  shopLogo: string | null;
  address1: string | null;
  address2: string | null;
  zip: string | null;
  city: string | null;
  shopPhone: string | null;
  shopEmail: string | null;
  siret: string | null;
  tva: string | null;
  rcs: string | null;
  capital: string | null;
  insurance: string | null;
  legalFooter: string | null;
  createdAt: Date;
  updatedAt: Date;
  isAutoEntrepreneur: boolean;
  [key: string]: string | Date | boolean | null | undefined;
}

interface InvoicePaymentFromDB {
  id: string;
  invoiceId: string;
  amount: number;
  method: string | null;
  paidAt: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RouteInvoiceData {
  number: string;
  issueDate: Date | null;
  dueDate: Date | null;
  status: string;
  type: string;
  validUntil: Date | null;
  parentId: string | null;
  shopName: string;
  shopLogo: string | null;
  shopAddress: string;
  shopZip: string;
  shopCity: string;
  shopPhone: string;
  shopEmail: string;
  shopSiret: string;
  shopTVA: string;
  shopRCS: string;
  shopCapital: string;
  shopInsurance: string;
  customerName: string;
  customerAddress: string | null | undefined;
  customerZip: string | null | undefined;
  customerCity: string | null | undefined;
  lines: Array<{
    description: string;
    qty: number;
    unitPriceHT: number | null;
    unitPriceTTC: number | null;
    vatRate: number | null;
    totalHT: number;
    totalTTC: number;
  }>;
  subtotalHT: number;
  vatAmount: number;
  totalTTC: number;
  pricingMode: string;
  paymentMethod: string | null;
  paidAt: Date | null;
  legalFooter: string | undefined;
  discountAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: Array<{ amount: number; method?: string | null; paidAt: string; note?: string | null }>;
  logoBytes?: Uint8Array;
}

/**
 * Build invoice data object from Prisma invoice + settings
 */
function buildInvoiceData(inv: InvoiceFromDB, customer: CustomerFromDB | null, settings: AppSettingFromDB | null): RouteInvoiceData {
  const s = settings || ({} as Partial<AppSettingFromDB>);
  
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
    shopLogo: s.shopLogo || null, // Logo atelier (.ico 32x32px)
    shopAddress: s.address1 || process.env.SHOP_ADDRESS1 || '123 Rue du Vélo',
    shopZip: s.zip || process.env.SHOP_ZIP || '75000',
    shopCity: s.city || process.env.SHOP_CITY || 'Paris',
    shopPhone: s.shopPhone || process.env.SHOP_PHONE || '01 23 45 67 89',
    shopEmail: s.shopEmail || process.env.SHOP_EMAIL || 'contact@atelier-velo.fr',
    
    // Informations légales (priorité : profil utilisateur > variables d'environnement)
    shopSiret: s.siret || process.env.SHOP_SIRET || '',
    shopTVA: s.tva || process.env.SHOP_TVA || '',
    shopRCS: s.rcs || process.env.SHOP_RCS || '',
    shopCapital: s.capital || process.env.SHOP_CAPITAL || '',
    shopInsurance: s.insurance || process.env.SHOP_INSURANCE || '',
    
    // Customer info
    customerName: customer 
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || customer.id
      : 'Client',
    customerAddress: customer?.address1,
    customerZip: customer?.zip,
    customerCity: customer?.city,
    
    // Lines with computed totals fallback
    lines: (inv.InvoiceLine || []).map((ln) => {
      const qty = ln.qty ?? 1;
      const vr = (ln.vatRate ?? inv.vatRate) || 0;
      let totalHT = ln.totalHT;
      let totalTTC = ln.totalTTC;
      // ✅ FIX: Recalculer si totalHT/totalTTC est null OU 0 (anciennes lignes non migrées)
      if (totalHT == null || totalHT === 0 || totalTTC == null || totalTTC === 0) {
        if (inv.pricingMode === 'HT_TVA') {
          const uht = ln.unitPriceHT ?? 0;
          totalHT = uht * qty;
          totalTTC = totalHT * (1 + vr / 100);
        } else {
          // Mode AE_TTC
          const uttc = ln.unitPriceTTC ?? ln.unitPriceHT ?? 0;  // Fallback sur unitPriceHT si unitPriceTTC manquant
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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  
  const inv = await prisma.invoice.findUnique({
    where: { id: id },
    include: { InvoiceLine: true },
  }) as InvoiceFromDB | null;
  
  if (!inv) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });

  // Get customer - PRIORITÉ: customerId direct > WorkOrder
  let customer: CustomerFromDB | null = null;
  if (inv.customerId) {
    // Facture directe avec client
    customer = await prisma.customer.findUnique({ where: { id: inv.customerId } }) as CustomerFromDB | null;
  } else if (inv.workOrderId) {
    // Facture depuis WorkOrder
    const wo = await prisma.workOrder.findUnique({ where: { id: inv.workOrderId } });
    if (wo?.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: wo.customerId } }) as CustomerFromDB | null;
    }
  }
  
  // Get user settings
  // Récupérer userId avec fallback premier utilisateur
  const userId = await getUserIdOrFirst(req);
  
  // PRIORITÉ 1: Chercher settings avec shopLogo défini
  let settings = await prisma.appSetting.findFirst({
    where: {
      shopLogo: { not: null }
    }
  }) as AppSettingFromDB | null;
  
  // PRIORITÉ 2: Si pas de logo, utiliser settings du userId
  if (!settings && userId) {
    settings = await prisma.appSetting.findUnique({ where: { userId } }) as AppSettingFromDB | null;
  }
  
  // PRIORITÉ 3: Sinon premier settings trouvé
  if (!settings) {
    settings = await prisma.appSetting.findFirst() as AppSettingFromDB | null;
  }

  // Logs pour debug
  logger.info('[PDF] Settings shopLogo', { shopLogo: settings?.shopLogo });
  if (!settings?.shopLogo) {
    logger.warn('[PDF] ⚠️ Aucun logo atelier configuré');
  }

  // Build invoice data
  const routeInvoiceData: RouteInvoiceData = buildInvoiceData(inv, customer, settings);
  // Discount and partial payments
  let paidAmount = 0;
  let payments: Array<{ amount: number; method?: string | null; paidAt: string; note?: string | null }> = [];
  try {
    const pays = await prisma.invoicePayment.findMany({ where: { invoiceId: inv.id }, orderBy: { paidAt: "asc" } }) as InvoicePaymentFromDB[];
    payments = pays.map((p) => ({ 
      amount: p.amount || 0, 
      method: p.method || null, 
      paidAt: p.paidAt?.toISOString?.() || p.paidAt.toString(), 
      note: p.note || null 
    }));
    paidAmount = pays.reduce((s, p) => s + (p.amount || 0), 0);
  } catch {}
  const remainingAmount = Math.max(0, (inv.totalTTC || 0) - paidAmount);
  routeInvoiceData.discountAmount = inv.discountAmount || 0;
  routeInvoiceData.paidAmount = paidAmount;
  routeInvoiceData.remainingAmount = remainingAmount;
  routeInvoiceData.payments = payments;

  // Logo loading: PRIORITÉ
  // 1. Logo uploadé (shopLogo path)
  // 2. Logo URL externe (env SHOP_LOGO_URL)
  // 3. Fallback logo.png
  let logoBytes: Uint8Array | undefined;
  
  async function tryLoadLogoFromUrl(url: string) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (resp.ok) {
        const arr = new Uint8Array(await resp.arrayBuffer());
        logoBytes = arr;
        return true;
      }
    } catch {}
    return false;
  }
  
  let logoLoaded = false;
  
  // PRIORITÉ 1: Logo uploadé par utilisateur (PNG uniquement)
  if (routeInvoiceData.shopLogo && typeof routeInvoiceData.shopLogo === 'string') {
    logger.info('[PDF] 🔍 Tentative chargement logo', { shopLogo: routeInvoiceData.shopLogo });
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // shopLogo format: "/uploads/logos/user_timestamp.png"
      const relativePath = routeInvoiceData.shopLogo.startsWith('/') 
        ? routeInvoiceData.shopLogo.slice(1) 
        : routeInvoiceData.shopLogo;
      
      // IMPORTANT: Uploads dans AppData (pas Program Files = lecture seule)
      // En production Electron, charger depuis USER_DATA_PATH/uploads
      // En dev, charger depuis public/
      const fullPath = process.env.USER_DATA_PATH
        ? path.join(process.env.USER_DATA_PATH, relativePath)
        : path.join(process.cwd(), 'public', relativePath);
      
      logger.info('[PDF] 📁 Chemin complet', { fullPath });
      logger.info('[PDF] 🔧 USER_DATA_PATH', { userDataPath: process.env.USER_DATA_PATH || 'non défini (mode dev)' });
      
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        logoBytes = new Uint8Array(buf);
        logoLoaded = true;
        logger.info('[PDF] ✅ Logo atelier chargé', { relativePath, bytes: buf.length });
      } else {
        logger.warn('[PDF] ⚠️ Logo introuvable', { fullPath });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error('[PDF] ❌ Erreur chargement logo', { error: errorMessage });
    }
  } else {
    logger.info('[PDF] ❌ Pas de shopLogo configuré');
  }
  
  // PRIORITÉ 2: Logo URL externe (env)
  if (!logoLoaded) {
    const logoUrl = process.env.SHOP_LOGO_URL;
    if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
      logoLoaded = await tryLoadLogoFromUrl(logoUrl);
      if (logoLoaded) logger.info('[PDF] Logo URL externe chargé');
    }
  }
  
  // PRIORITÉ 3: Fallback logo.png
  if (!logoLoaded) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const resPath = process.env.RESOURCES_PATH;
      
      // Electron packaged
      if (resPath) {
        const p = path.join(resPath, 'web', 'public', 'logo.png');
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          logoBytes = new Uint8Array(buf);
          logoLoaded = true;
          logger.info('[PDF] Logo fallback (resources) chargé');
        }
      }
      
      // Local dev
      if (!logoLoaded) {
        const p2 = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(p2)) {
          const buf = fs.readFileSync(p2);
          logoBytes = new Uint8Array(buf);
          logoLoaded = true;
          logger.info('[PDF] Logo fallback (public) chargé');
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.error('[PDF] Erreur fallback logo.png', { error: errorMessage });
    }
  }
  
  if (!logoLoaded) {
    logger.warn('[PDF] Aucun logo chargé - cadre fallback sera affiché');
  }
  
  // Convert to PdfInvoiceData format (with string dates)
  const pdfInvoiceData: PdfInvoiceData = {
    ...(routeInvoiceData as Omit<PdfInvoiceData, 'issueDate' | 'dueDate' | 'validUntil' | 'paidAt' | 'logoBytes'>),
    issueDate: routeInvoiceData.issueDate?.toISOString() || new Date().toISOString(),
    dueDate: routeInvoiceData.dueDate?.toISOString() || null,
    validUntil: routeInvoiceData.validUntil?.toISOString() || null,
    paidAt: routeInvoiceData.paidAt?.toISOString() || null,
    logoBytes,
    freeTierBranding: await isFreeTier(),
  };

  // Generate PDF
  const pdfBytes = await generateInvoicePDF(pdfInvoiceData);
  
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
