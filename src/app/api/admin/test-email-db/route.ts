import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-with-db-config';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/test-email-db
 * Teste l'envoi email avec config DB (notre modification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Email de test requis' },
        { status: 400 }
      );
    }

    logger.info('[TEST-EMAIL-DB] Test envoi avec config DB', { destinataire: testEmail });

    // Utilise sendEmail qui lit config DB en priorité
    await sendEmail({
      to: testEmail,
      subject: '✅ Test Email DB Config - Atelier Vélo+',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ Test Config DB Réussi!</h2>
          
          <p><strong>Félicitations!</strong></p>
          
          <p>Cet email a été envoyé en utilisant la <strong>configuration SMTP stockée en base de données</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">✨ Fonctionnalités validées:</h3>
            <ul>
              <li>✅ Lecture config SMTP depuis DB (SystemSettings)</li>
              <li>✅ Fonction <code>email-with-db-config.ts</code></li>
              <li>✅ Fallback .env si DB vide</li>
              <li>✅ Support Gmail + Resend</li>
            </ul>
          </div>
          
          <p>Tu peux maintenant:</p>
          <ul>
            <li>📧 Envoyer factures par email</li>
            <li>📄 Envoyer devis par email</li>
            <li>🎫 Envoyer tickets caisse</li>
            <li>📅 Confirmations RDV</li>
            <li>💬 Communications clients</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Atelier Vélo+</strong><br>
            Test envoi email avec config DB - ${new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      `,
    });

    logger.info('[TEST-EMAIL-DB] Email envoyé avec succès');

    return NextResponse.json({
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail}!`,
      source: 'DB config avec fallback .env',
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[TEST-EMAIL-DB] ❌ Erreur:', error);

    return NextResponse.json(
      {
        error: message,
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
