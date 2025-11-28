import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from "@/lib/email-with-db-config";
import { getUserId } from '@/lib/api-helpers';
import { checkEmailLicense, incrementEmailAfterSend } from '@/lib/license-guards';
import { logEmail } from '@/lib/email-logger';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/cash-register/send-receipt
 * Envoyer ticket de caisse par email
 */
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const {
      email,
      type,
      amount,
      discount,
      finalAmount,
      paymentMethod,
      description,
    } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // ⭐ VÉRIFICATION LICENCE: Limite emails
    const licenseError = await checkEmailLicense();
    if (licenseError) return licenseError;

    // Traduction moyen de paiement
    const paymentMethodLabel = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      check: 'Chèque',
      transfer: 'Virement',
    }[paymentMethod] || paymentMethod;

    // Traduction type
    const typeLabel = type === 'direct_sale' ? 'Vente directe' : 'Paiement de facture';

    // Générer HTML ticket
    const ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .ticket {
            background: white;
            border: 2px dashed #333;
            padding: 30px;
            border-radius: 8px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .content {
            margin: 20px 0;
          }
          .line {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .line.total {
            font-weight: bold;
            font-size: 18px;
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            margin-top: 10px;
          }
          .label {
            color: #666;
          }
          .value {
            font-weight: 600;
            color: #333;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #333;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>🚴 TICKET DE CAISSE</h1>
            <p>${new Date().toLocaleString('fr-FR')}</p>
            <p>${typeLabel}</p>
          </div>
          
          <div class="content">
            ${description ? `
              <div class="line">
                <span class="label">Description:</span>
                <span class="value">${description}</span>
              </div>
            ` : ''}
            
            <div class="line">
              <span class="label">Montant initial:</span>
              <span class="value">${amount.toFixed(2)} €</span>
            </div>
            
            ${discount > 0 ? `
              <div class="line">
                <span class="label">Remise (${discount}%):</span>
                <span class="value">-${(amount * discount / 100).toFixed(2)} €</span>
              </div>
            ` : ''}
            
            <div class="line total">
              <span class="label">TOTAL:</span>
              <span class="value">${finalAmount.toFixed(2)} €</span>
            </div>
            
            <div class="line">
              <span class="label">Moyen de paiement:</span>
              <span class="value">${paymentMethodLabel}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Merci de votre visite !</p>
            <p>Ce ticket a été envoyé automatiquement.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer email
    const subject = `Ticket de caisse - ${new Date().toLocaleDateString('fr-FR')}`;
    await sendEmail({
      to: email,
      subject,
      html: ticketHtml,
    });

    // ✅ TRACING: Enregistrer l'email dans Communication
    // Note: sendEmail() log déjà, mais on ajoute des métadonnées spécifiques
    try {
      // Trouver customerId depuis email
      const customer = await prisma.customer.findUnique({
        where: { email },
        select: { id: true }
      });
      
      await logEmail({
        to: email,
        subject,
        html: ticketHtml,
        type: 'receipt',
        event: 'receipt_sent',
        customerId: customer?.id,
        metadata: { 
          type,
          amount,
          discount,
          finalAmount,
          paymentMethod 
        },
      }, req);
    } catch (logError) {
      logger.error('[send-receipt] Error logging email:', logError);
    }

    // ⭐ Incrémenter compteur emails après envoi réussi
    await incrementEmailAfterSend();

    return NextResponse.json({ success: true });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur envoi ticket';
    logger.error('[SEND-RECEIPT] Erreur', { error: message });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
