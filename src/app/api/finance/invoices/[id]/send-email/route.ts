import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF, formatDocumentNumber } from "@/lib/pdf-invoice";
import { sendEmail, generateInvoiceEmailHTML } from "@/lib/email-with-db-config";
import { checkEmailWithPdfLicense, incrementEmailAfterSend } from "@/lib/license-guards";
import { isFreeTier } from "@/lib/free-tier-guards";
import { logEmail } from "@/lib/email-logger";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Types pour Invoice avec relations
type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: { 
    InvoiceLine: true;
    WorkOrder: {
      include: {
        Customer: true;
      };
    };
  };
}>;

interface Customer {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  address1: string | null;
  zip: string | null;
  city: string | null;
}

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

/**
 * POST /api/finance/invoices/[id]/send-email
 * Send invoice by email to customer
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {  const { id } = await params;

  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  // ⭐ VÉRIFICATION LICENCE: Limite emails + feature PDF direct send
  const licenseError = await checkEmailWithPdfLicense();
  if (licenseError) return licenseError;

  try {
    // ✅ FIX: Include WorkOrder avec Customer pour éviter N+1 queries
    // Support factures avec workOrder (pattern principal)
    // Si facture directe (customerId), on récupérera le customer séparément
    // Même pattern que l'API GET /api/finance/invoices/[id]
    const invoice = await prisma.invoice.findUnique({
      where: { id: id },
      include: { 
        InvoiceLine: true,
        // Include WorkOrder avec Customer en une seule query
        WorkOrder: {
          include: {
            Customer: true
          }
        }
      },
    }) as InvoiceWithRelations | null;

    if (!invoice) {
      return NextResponse.json({ error: "invoice_not_found" }, { status: 404 });
    }

    // Must be issued to send
    if (invoice.status === 'draft') {
      return NextResponse.json({ 
        error: "invoice_not_issued", 
        message: "La facture doit être émise avant d'être envoyée" 
      }, { status: 400 });
    }

    // ✅ FIX: Récupérer customer via WorkOrder.Customer (inclus) OU customerId direct
    let customer: Customer | null = invoice.WorkOrder?.Customer || null;
    
    // Si pas de customer via workOrder mais customerId présent, récupérer directement
    if (!customer && invoice.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: invoice.customerId }
      }) as Customer | null;
    }
    
    const customerEmail = customer?.email;

    if (!customerEmail) {
      return NextResponse.json({ 
        error: "no_customer_email", 
        message: "Aucun email client trouvé. Veuillez renseigner l'email du client associé à cette facture." 
      }, { status: 400 });
    }

    // Get user settings
    const userId = getUserId(req);
    const settings = userId 
      ? await prisma.appSetting.findUnique({ where: { userId } }) 
      : null;

    const shopName = settings?.shopName || process.env.SHOP_NAME || 'Atelier Vélo+';
    const isAutoEntrepreneur = settings?.isAutoEntrepreneur || false;

    // Build invoice data for PDF
    const invoiceData = {
      type: invoice.type,
      number: invoice.number || invoice.id,
      issueDate: invoice.issueDate || invoice.createdAt,
      dueDate: invoice.dueDate,
      status: invoice.status,
      
      shopName,
      shopAddress: settings?.address1 || process.env.SHOP_ADDRESS1 || '',
      shopZip: settings?.zip || process.env.SHOP_ZIP || '',
      shopCity: settings?.city || process.env.SHOP_CITY || '',
      shopPhone: settings?.shopPhone || process.env.SHOP_PHONE,
      shopEmail: settings?.shopEmail || process.env.SHOP_EMAIL,
      shopSiret: settings?.siret || process.env.SHOP_SIRET,
      shopTVA: settings?.tva || process.env.SHOP_TVA,
      shopRCS: settings?.rcs || process.env.SHOP_RCS,
      shopCapital: settings?.capital || process.env.SHOP_CAPITAL,
      shopInsurance: settings?.insurance || process.env.SHOP_INSURANCE,
      
      customerName: customer 
        ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email
        : 'Client',
      customerAddress: customer?.address1,
      customerZip: customer?.zip,
      customerCity: customer?.city,
      
      lines: (invoice.InvoiceLine || []).map((ln) => {
        const qty = ln.qty ?? 1;
        const vatRate = isAutoEntrepreneur ? 0 : (ln.vatRate ?? 0);
        
        // ✅ FIX: En mode AE_TTC, utiliser unitPriceTTC de la DB, sinon calculer depuis HT
        const unitPriceHT = ln.unitPriceHT ?? 0;
        const unitPriceTTC = ln.unitPriceTTC ?? (unitPriceHT * (1 + vatRate / 100));
        
        // ✅ FIX: Calculer totaux depuis les bons prix (TTC si AE, HT sinon)
        const totalHT = ln.totalHT ?? (unitPriceHT * qty);
        const totalTTC = ln.totalTTC ?? (unitPriceTTC * qty);
        
        return {
          description: ln.description,
          qty,
          unitPriceHT,
          unitPriceTTC,
          vatRate,
          totalHT,
          totalTTC,
        };
      }),
      
      subtotalHT: invoice.subtotalHT,
      vatAmount: isAutoEntrepreneur ? 0 : invoice.vatAmount,
      totalTTC: invoice.totalTTC,
      pricingMode: isAutoEntrepreneur ? 'AE_TTC' : (invoice.pricingMode as 'AE_TTC' | 'HT_TVA'),
      isAutoEntrepreneur,
      
      paymentMethod: invoice.paymentMethod,
      paidAt: invoice.paidAt,
      
      legalFooter: settings?.legalFooter || process.env.LEGAL_FOOTER,
    };

    // Chargement du logo atelier
    let logoBytes: Uint8Array | undefined;
    let logoLoaded = false;
    
    logger.info('[send-email] 🔍 Tentative chargement logo...');
    logger.info('[send-email] Settings shopLogo', { shopLogo: settings?.shopLogo });
    
    // PRIORITÉ 1: Logo uploadé par l'utilisateur
    if (settings?.shopLogo && typeof settings.shopLogo === 'string') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        const relativePath = settings.shopLogo.startsWith('/') 
          ? settings.shopLogo.slice(1) 
          : settings.shopLogo;
        
        const fullPath = process.env.USER_DATA_PATH
          ? path.join(process.env.USER_DATA_PATH, relativePath)
          : path.join(process.cwd(), 'public', relativePath);
        
        logger.info('[send-email] Chemin logo atelier', { fullPath });
        
        if (fs.existsSync(fullPath)) {
          const buf = fs.readFileSync(fullPath);
          logoBytes = new Uint8Array(buf);
          logoLoaded = true;
          logger.info('[send-email] ✅ Logo atelier chargé', { relativePath });
        } else {
          logger.warn('[send-email] ⚠️ Fichier logo introuvable', { fullPath });
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.error('[send-email] ❌ Erreur chargement logo atelier', { error: errorMessage });
      }
    } else {
      logger.info('[send-email] Pas de logo atelier configuré (settings.shopLogo vide)');
    }
    
    // PRIORITÉ 2: Fallback logo.png (logo de l'application)
    if (!logoLoaded) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const resPath = process.env.RESOURCES_PATH;
        
        // Electron packaged
        if (resPath) {
          const p = path.join(resPath, 'web', 'public', 'logo.png');
          logger.info('[send-email] Tentative fallback (resources)', { path: p });
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            logoBytes = new Uint8Array(buf);
            logoLoaded = true;
            logger.info('[send-email] ✅ Logo fallback (resources) chargé');
          }
        }
        
        // Dev local
        if (!logoLoaded) {
          const p2 = path.join(process.cwd(), 'public', 'logo.png');
          logger.info('[send-email] Tentative fallback (public)', { path: p2 });
          if (fs.existsSync(p2)) {
            const buf = fs.readFileSync(p2);
            logoBytes = new Uint8Array(buf);
            logoLoaded = true;
            logger.info('[send-email] ✅ Logo fallback (public) chargé');
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.error('[send-email] ❌ Erreur fallback logo.png', { error: errorMessage });
      }
    }
    
    if (!logoLoaded) {
      logger.warn('[send-email] ⚠️ Aucun logo chargé - placeholder sera affiché');
    }
    
    // Convertir les dates en chaînes de caractères ISO pour le PDF
    const pdfData = {
      ...invoiceData,
      issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : '',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : null,
      validUntil: invoice.validUntil ? new Date(invoice.validUntil).toISOString().split('T')[0] : null,
      paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString().split('T')[0] : null,
      logoBytes,
      freeTierBranding: await isFreeTier(),
    };

    // Generate PDF
    const pdfBytes = await generateInvoicePDF(pdfData);

    // Format document number professionally
    const formattedNumber = formatDocumentNumber(
      invoice.number || invoice.id,
      invoice.type || 'invoice',
      invoiceData.issueDate?.toString() || new Date().toISOString()
    );

    // Generate email HTML
    const emailHTML = generateInvoiceEmailHTML({
      customerName: invoiceData.customerName,
      invoiceNumber: formattedNumber,
      totalTTC: invoice.totalTTC,
      shopName,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : undefined,
      documentType: invoice.type as 'invoice' | 'quote' | 'credit',
    });

    // Send email
    const docType = invoice.type === 'quote' ? 'Devis' : invoice.type === 'credit' ? 'Avoir' : 'Facture';
    const docTypeFile = invoice.type === 'quote' ? 'devis' : invoice.type === 'credit' ? 'avoir' : 'facture';
    const subject = `${docType} ${formattedNumber} - ${shopName}`;
    const filename = `${docTypeFile}_${formattedNumber}.pdf`;
    
    await sendEmail({
      to: customerEmail,
      subject,
      html: emailHTML,
      attachments: [{
        filename,
        content: pdfBytes,
        contentType: 'application/pdf',
      }],
    });

    // ✅ TRACING: Enregistrer l'email dans Communication
    // Note: sendEmail() log déjà, mais on ajoute des métadonnées spécifiques
    try {
      await logEmail({
        to: customerEmail,
        subject,
        html: emailHTML,
        type: invoice.type === 'quote' ? 'quote' : invoice.type === 'credit' ? 'credit' : 'invoice',
        event: `${invoice.type}_sent`,
        customerId: customer?.id,
        invoiceId: invoice.id,
        workOrderId: invoice.workOrderId || undefined,
        metadata: { 
          invoiceNumber: invoice.number,
          docType,
          filename 
        },
      }, req);
    } catch (logError) {
      const errorMessage = logError instanceof Error ? logError.message : String(logError);
      logger.error('[send-email] Error logging email', { error: errorMessage });
    }

    // ⭐ Incrémenter compteur emails après envoi réussi
    await incrementEmailAfterSend();

    return NextResponse.json({ 
      success: true, 
      message: `${docType} envoyé${invoice.type === 'quote' ? '' : 'e'} à ${customerEmail}`,
      sentTo: customerEmail,
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Email send error', { error: errorMessage });
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'email_send_failed', 
      detail 
    }, { status: 500 });
  }
}
