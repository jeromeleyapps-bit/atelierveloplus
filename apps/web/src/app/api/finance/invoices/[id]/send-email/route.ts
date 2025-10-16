import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf-invoice";
import { sendEmail, generateInvoiceEmailHTML } from "@/lib/email";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

/**
 * POST /api/finance/invoices/[id]/send-email
 * Send invoice by email to customer
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    // Get invoice with lines
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { lines: true },
    });

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

    // Get customer via work order
    let customer: any = null;
    let customerEmail: string | null = null;

    if (invoice.workOrderId) {
      const wo = await prisma.workOrder.findUnique({ 
        where: { id: invoice.workOrderId } 
      });
      
      if (wo?.customerId) {
        customer = await prisma.customer.findUnique({ 
          where: { id: wo.customerId } 
        });
        customerEmail = customer?.email;
      }
    }

    if (!customerEmail) {
      return NextResponse.json({ 
        error: "no_customer_email", 
        message: "Aucun email client trouvé" 
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
      
      lines: invoice.lines.map((ln: any) => {
        const qty = ln.qty ?? 1;
        const unitPriceHT = ln.unitPriceHT ?? 0;
        // Forcer TVA à 0 si auto-entrepreneur
        const vatRate = isAutoEntrepreneur ? 0 : (ln.vatRate ?? 0);
        const totalHT = ln.totalHT ?? (unitPriceHT * qty);
        const totalTTC = isAutoEntrepreneur ? totalHT : (ln.totalTTC ?? (totalHT * (1 + vatRate / 100)));
        
        return {
          description: ln.description,
          qty,
          unitPriceHT,
          unitPriceTTC: unitPriceHT * (1 + vatRate / 100),
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

    // Generate PDF
    const pdfBytes = await generateInvoicePDF(invoiceData);

    // Generate email HTML
    const emailHTML = generateInvoiceEmailHTML({
      customerName: invoiceData.customerName,
      invoiceNumber: invoiceData.number,
      totalTTC: invoice.totalTTC,
      shopName,
      dueDate: invoice.dueDate,
    });

    // Send email
    const docType = invoice.type === 'quote' ? 'Devis' : invoice.type === 'credit' ? 'Avoir' : 'Facture';
    const docTypeFile = invoice.type === 'quote' ? 'devis' : invoice.type === 'credit' ? 'avoir' : 'facture';
    
    await sendEmail({
      to: customerEmail,
      subject: `${docType} ${invoice.number || invoice.id} - ${shopName}`,
      html: emailHTML,
      attachments: [{
        filename: `${docTypeFile}_${invoice.number || invoice.id}.pdf`,
        content: pdfBytes,
        contentType: 'application/pdf',
      }],
    });

    return NextResponse.json({ 
      success: true, 
      message: `${docType} envoyé${invoice.type === 'quote' ? '' : 'e'} à ${customerEmail}`,
      sentTo: customerEmail,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ 
      error: 'email_send_failed', 
      detail: error.message 
    }, { status: 500 });
  }
}
