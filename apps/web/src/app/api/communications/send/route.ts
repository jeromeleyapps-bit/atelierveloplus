/**
 * POST /api/communications/send
 * Send email or SMS communication
 */

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { sendEmail, sendSMS } from "@/lib/hubspot";
import { replaceVariables, type TemplateVariables } from "@/lib/template-engine";

export const dynamic = "force-dynamic";

function getUserId(req: Request): string | null {
  const uid = req.headers.get("x-user-id");
  return uid && uid.trim() ? uid : null;
}

export async function POST(req: Request) {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });

  const userId = getUserId(req);
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

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        bikes: true
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
          bike: true,
          parts: true
        }
      });
    }

    // Get shop settings
    const shopSettings = await prisma.appSetting.findUnique({
      where: { userId }
    });

    // Get template
    const template = type === 'email'
      ? await prisma.emailTemplate.findFirst({ 
          where: { event, active: true } 
        })
      : await prisma.smsTemplate.findFirst({ 
          where: { event, active: true } 
        });

    if (!template) {
      return NextResponse.json({ 
        error: "template_not_found", 
        message: `No active template found for event: ${event}` 
      }, { status: 404 });
    }

    // Prepare variables
    const variables: TemplateVariables = {
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      },
      shop: {
        name: shopSettings?.shopName || 'Atelier Vélo',
        address: shopSettings?.shopAddress,
        city: shopSettings?.shopCity,
        postalCode: shopSettings?.shopPostalCode,
        phone: shopSettings?.shopPhone,
        email: shopSettings?.shopEmail,
        hours: 'Lun-Ven: 9h-18h, Sam: 9h-12h'
      },
      bike: workOrder?.bike ? {
        brand: workOrder.bike.brand,
        model: workOrder.bike.model,
        serialNo: workOrder.bike.serialNo,
        color: workOrder.bike.color
      } : customer.bikes[0] ? {
        brand: customer.bikes[0].brand,
        model: customer.bikes[0].model,
        serialNo: customer.bikes[0].serialNo,
        color: customer.bikes[0].color
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
    
    const content = type === 'email' && 'htmlContent' in template
      ? replaceVariables(template.htmlContent, variables)
      : replaceVariables(template.content, variables);

    // Send communication
    let result;
    let recipient: string;

    if (type === 'email') {
      if (!customer.email) {
        return NextResponse.json({ 
          error: "no_email", 
          message: "Customer has no email address" 
        }, { status: 400 });
      }

      recipient = customer.email;
      result = await sendEmail({
        to: customer.email,
        subject: subject!,
        htmlContent: content,
        textContent: 'textContent' in template ? template.textContent : undefined
      });
    } else {
      if (!customer.phone) {
        return NextResponse.json({ 
          error: "no_phone", 
          message: "Customer has no phone number" 
        }, { status: 400 });
      }

      recipient = customer.phone;
      result = await sendSMS({
        to: customer.phone,
        content
      });
    }

    // Save to database
    const communication = await prisma.communication.create({
      data: {
        customerId,
        workOrderId,
        invoiceId,
        type,
        event,
        recipient,
        subject,
        content,
        status: result.success ? 'sent' : 'failed',
        provider: 'hubspot',
        externalId: result.messageId,
        sentAt: result.success ? new Date() : null,
        error: result.success ? null : result.error,
        metadata: JSON.stringify({ variables, result })
      }
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: "send_failed", 
        message: result.error,
        communicationId: communication.id
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      communicationId: communication.id,
      messageId: result.messageId
    }, { status: 200 });

  } catch (error: any) {
    console.error('Communication send error:', error);
    return NextResponse.json({ 
      error: "send_failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
