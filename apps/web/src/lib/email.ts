/**
 * Email module - Resend only
 * Simple and reliable email sending via Resend API
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
  }>;
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured in environment variables');
  }
  
  const payload: any = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  // Resend attachments format (base64)
  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map(att => ({
      filename: att.filename,
      content: Buffer.from(att.content).toString('base64'),
    }));
  }

  console.log('📧 Envoi email via Resend à:', options.to);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur Resend:', errorText);
    throw new Error(`Resend API error: ${errorText}`);
  }
  
  const result = await response.json();
  console.log('✅ Email envoyé via Resend - ID:', result.id);
}

/**
 * Generate invoice email HTML
 */
export function generateInvoiceEmailHTML(data: {
  customerName: string;
  invoiceNumber: string;
  totalTTC: number;
  shopName: string;
  dueDate?: string | null;
}): string {
  const dueDateText = data.dueDate 
    ? `<p>Date d'échéance : <strong>${new Date(data.dueDate).toLocaleDateString('fr-FR')}</strong></p>`
    : '';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${data.invoiceNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${data.shopName}</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
    <h2 style="color: #1976d2; margin-top: 0;">Votre facture est prête</h2>
    
    <p>Bonjour ${data.customerName},</p>
    
    <p>Merci pour votre confiance ! Vous trouverez ci-joint votre facture.</p>
    
    <div style="background-color: white; padding: 20px; border-left: 4px solid #1976d2; margin: 20px 0;">
      <p style="margin: 0;"><strong>Numéro de facture :</strong> ${data.invoiceNumber}</p>
      <p style="margin: 10px 0 0 0;"><strong>Montant total TTC :</strong> ${data.totalTTC.toFixed(2)} €</p>
      ${dueDateText}
    </div>
    
    <p>Le PDF de votre facture est joint à cet email.</p>
    
    <p>Pour toute question, n'hésitez pas à nous contacter.</p>
    
    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>${data.shopName}</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
  </div>
</body>
</html>
  `.trim();
}
