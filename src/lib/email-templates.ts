/**
 * Email templates for booking confirmations
 */

export interface BookingEmailData {
  customerName: string;
  startDate: Date;
  endDate: Date;
  bike?: string;
  description?: string;
  shopName: string;
  shopAddress?: string;
  shopCity?: string;
  shopPhone?: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Generate customer confirmation email HTML
 */
export function generateBookingConfirmationHTML(data: BookingEmailData): string {
  const dateStr = data.startDate.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const timeStr = `${data.startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${data.endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de rendez-vous</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #26C6DA 0%, #00ACC1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">📅 Rendez-vous confirmé !</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Bonjour <strong>${data.customerName}</strong>,</p>
    
    <p>Votre rendez-vous chez <strong>${data.shopName}</strong> est confirmé !</p>
    
    <div style="background-color: white; padding: 25px; border-left: 4px solid #26C6DA; margin: 25px 0; border-radius: 5px;">
      <h2 style="color: #26C6DA; margin-top: 0; font-size: 20px;">📅 Détails du rendez-vous</h2>
      <p style="margin: 10px 0;"><strong>📆 Date :</strong> ${dateStr}</p>
      <p style="margin: 10px 0;"><strong>🕗 Horaire :</strong> ${timeStr}</p>
      ${data.bike ? `<p style="margin: 10px 0;"><strong>🚲 Vélo :</strong> ${data.bike}</p>` : ''}
      ${data.description ? `<p style="margin: 10px 0;"><strong>📝 Besoin :</strong> ${data.description}</p>` : ''}
    </div>
    
    <div style="background-color: #E0F7FA; padding: 20px; border-radius: 5px; margin: 25px 0;">
      <h3 style="color: #00838F; margin-top: 0; font-size: 18px;">📍 Adresse de l'atelier</h3>
      ${data.shopAddress ? `<p style="margin: 5px 0;">${data.shopAddress}</p>` : ''}
      ${data.shopCity ? `<p style="margin: 5px 0;">${data.shopCity}</p>` : ''}
      ${data.shopPhone ? `<p style="margin: 5px 0;"><strong>📞</strong> ${data.shopPhone}</p>` : ''}
    </div>
    
    <div style="background-color: #FFF3E0; padding: 15px; border-radius: 5px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px;">💡 <strong>Conseil :</strong> Pensez à apporter votre vélo 5 minutes avant l'heure du rendez-vous.</p>
    </div>
    
    <p style="margin-top: 30px;">Si vous avez des questions ou besoin de modifier votre rendez-vous, n'hésitez pas à nous contacter.</p>
    
    <p style="margin-top: 30px;">
      À très bientôt,<br>
      <strong>${data.shopName}</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
    <p>Cet email a été envoyé automatiquement suite à votre réservation en ligne.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate shop notification email HTML
 */
export function generateBookingNotificationHTML(data: BookingEmailData): string {
  const dateStr = data.startDate.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const timeStr = `${data.startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${data.endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Nouvelle réservation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #26C6DA; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🔔 Nouvelle réservation</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
    <h2 style="color: #26C6DA; margin-top: 0;">Détails de la réservation</h2>
    
    <div style="background-color: white; padding: 20px; border-left: 4px solid #26C6DA; margin: 20px 0;">
      <p><strong>👤 Client :</strong> ${data.customerName}</p>
      <p><strong>📧 Email :</strong> ${data.customerEmail || '-'}</p>
      <p><strong>📞 Téléphone :</strong> ${data.customerPhone || '-'}</p>
      <p><strong>📆 Date :</strong> ${dateStr}</p>
      <p><strong>🕗 Horaire :</strong> ${timeStr}</p>
      ${data.bike ? `<p><strong>🚲 Vélo :</strong> ${data.bike}</p>` : ''}
      ${data.description ? `<p><strong>📝 Besoin :</strong> ${data.description}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #666;">Cette réservation a été effectuée via le formulaire en ligne.</p>
  </div>
</body>
</html>
  `.trim();
}
