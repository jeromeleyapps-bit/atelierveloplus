/**
 * POST /api/communications/send
 * Send email communication (SMS removed)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, determineEmailProvider } from "@/lib/email-with-db-config";
import { getUserIdOrFirst } from "@/lib/api-helpers";
import { replaceVariables, type TemplateVariables } from "@/lib/template-engine";
import { canSendEmail, incrementEmailCount } from "@/lib/license-manager";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
  // ✅ FIX: Utiliser getUserIdOrFirst pour mode Electron (pas de JWT requis)
  // Sinon déconnexion automatique si pas de token JWT valide
  const userId = await getUserIdOrFirst(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, event, customerId, workOrderId, invoiceId, data } = body;

    // Validate
    if (!type || !event || !customerId) {
      return NextResponse.json({ 
        error: "missing_fields", 
        message: "type, event, and customerId are required" 
      }, { status: 400 });
    }

    // ⭐ Phase 2: Vérifier limite licence (Basique: 50 emails/semaine)
    const canSend = await canSendEmail();
    if (!canSend) {
      return NextResponse.json({
        error: "license_limit",
        reason: "Limite de 30 emails/mois atteinte pour licence Basique",
        upgradeUrl: "/admin/license/upgrade",
      }, { status: 403 });
    }

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        CustomerBike: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "customer_not_found" }, { status: 404 });
    }

    // Get work order if provided
    let workOrder = null;
    if (workOrderId) {
      workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          CustomerBike: true,
          WorkOrderLine: true
        }
      });
    }

    // Get shop settings - Fallback to first active user if not found
    let shopSettings = await prisma.appSetting.findUnique({
      where: { userId }
    });

    // Fallback: si pas de settings pour ce userId, prendre le premier user actif
    if (!shopSettings) {
      logger.info('[COMMS] No AppSetting for userId:', userId, '- using first active user');
      const firstUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      });
      if (firstUser) {
        shopSettings = await prisma.appSetting.findUnique({
          where: { userId: firstUser.id }
        });
      }
    }

    // Get template
    const template = type === 'email'
      ? await prisma.emailTemplate.findFirst({ 
          where: { event, active: true } 
        })
      : await prisma.sMSTemplate.findFirst({ 
          where: { event, active: true } 
        });

    if (!template) {
      return NextResponse.json({ 
        error: "template_not_found", 
        message: `No active template found for event: ${event}` 
      }, { status: 404 });
    }

    // Prepare variables
    logger.info('[COMMS] Shop Settings:', {
      name: shopSettings?.shopName,
      address1: shopSettings?.address1,
      city: shopSettings?.city,
      zip: shopSettings?.zip,
      phone: shopSettings?.shopPhone,
      email: shopSettings?.shopEmail
    });

    const variables: TemplateVariables = {
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      },
      shop: {
        name: shopSettings?.shopName || 'Atelier Vélo',
        address: shopSettings?.address1, // Legacy
        address1: shopSettings?.address1 || '',
        address2: shopSettings?.address2 || '',
        city: shopSettings?.city || '',
        zip: shopSettings?.zip || '',
        postalCode: shopSettings?.zip, // Legacy
        country: shopSettings?.country || 'France',
        phone: shopSettings?.shopPhone || '',
        email: shopSettings?.shopEmail || '',
        siret: shopSettings?.siret || '',
        tva: shopSettings?.tva || '',
        hours: 'Lun-Ven: 9h-18h, Sam: 9h-12h'
      },
      bike: workOrder?.bike ? {
        brand: workOrder.CustomerBike.brand,
        model: workOrder.CustomerBike.model,
        serialNo: workOrder.CustomerBike.serialNo,
        color: workOrder.CustomerBike.color
      } : customer.CustomerBike[0] ? {
        brand: customer.CustomerBike[0].brand,
        model: customer.CustomerBike[0].model,
        serialNumber: customer.CustomerBike[0].serialNumber,
        color: customer.CustomerBike[0].color
      } : undefined,
      workOrder: workOrder ? {
        id: workOrder.id,
        type: workOrder.type,
        status: workOrder.status
      } : undefined,
      parts: workOrder?.parts?.map(p => ({
        description: p.description,
        qty: p.qty,
        priceHT: p.priceHT,
        totalHT: p.qty * p.priceHT
      })),
      ...data // Additional data from request
    };

    // Replace variables in template
    const subject = type === 'email' && 'subject' in template 
      ? replaceVariables(template.subject, variables)
      : undefined;
    
    // Type guard et extraction content selon le type de template
    let content: string;
    if ('htmlContent' in template) {
      // EmailTemplate
      content = replaceVariables(template.htmlContent, variables);
    } else if ('content' in template) {
      // SMSTemplate
      content = replaceVariables(template.content, variables);
    } else {
      // Fallback (ne devrait jamais arriver)
      content = '';
    }

    // Send communication (email only, SMS removed)
    if (type !== 'email') {
      return NextResponse.json({ 
        error: "unsupported_type", 
        message: "Only email communications are supported. SMS has been removed." 
      }, { status: 400 });
    }

    if (!customer.email) {
      return NextResponse.json({ 
        error: "no_email", 
        message: "Customer has no email address" 
      }, { status: 400 });
    }

    // Determine email provider (DB config or .env)
    const emailProvider = await determineEmailProvider();

    // Send email
    try {
      await sendEmail({
        to: customer.email,
        subject: subject!,
        html: content,
      });

      // Save to database
      const communication = await prisma.communication.create({
        data: {
          customerId,
          workOrderId,
          invoiceId,
          type,
          event,
          recipient: customer.email,
          subject,
          content,
          status: 'sent',
          provider: emailProvider, // Dynamique: gmail, resend, smtp, etc.
          sentAt: new Date(),
          metadata: JSON.stringify({ variables })
        }
      });

      // ⭐ Phase 2: Incrémenter compteur emails (Basique uniquement)
      await incrementEmailCount();

      return NextResponse.json({ 
        success: true,
        communicationId: communication.id
      }, { status: 200 });

    } catch (emailError) {
      const emailMessage = emailError instanceof Error ? emailError.message : String(emailError);
      
      // Save failed communication
      const communication = await prisma.communication.create({
        data: {
          customerId,
          workOrderId,
          invoiceId,
          type,
          event,
          recipient: customer.email,
          subject,
          content,
          status: 'failed',
          provider: emailProvider, // Même provider pour tracking cohérent
          error: emailMessage,
          metadata: JSON.stringify({ variables, error: emailMessage })
        }
      });

      return NextResponse.json({ 
        error: "send_failed", 
        message: emailMessage,
        communicationId: communication.id
      }, { status: 500 });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
    logger.error('Communication send error:', message);
    return NextResponse.json({ 
      error: "send_failed", 
      detail: error?.message || String(error)
    }, { status: 500 });
  }
}
