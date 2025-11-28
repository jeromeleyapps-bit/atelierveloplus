import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

interface NodemailerError extends Error {
  code?: string;
  responseCode?: number;
  command?: string;
}

/**
 * POST /api/admin/test-email
 * Teste la configuration SMTP en envoyant un email de test
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[TEST-EMAIL] 🔍 Début du test email...');
    
    const body = await request.json();
    logger.info('[TEST-EMAIL] 📦 Body reçu:', { 
      hasHost: !!body.host,
      hasPort: !!body.port,
      hasUser: !!body.user,
      hasPass: !!body.pass,
      hasFrom: !!body.from,
      hasTestEmail: !!body.testEmail
    });
    
    const { host, port, secure, user, pass, from, testEmail } = body;

    // Validation
    if (!host || !port || !user || !pass || !from || !testEmail) {
      logger.info('[TEST-EMAIL] ❌ Validation échouée - champs manquants');
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    logger.info('[TEST-EMAIL] ✅ Configuration:', {
      host,
      port,
      secure,
      user,
      from: from,
      testEmail
    });

    // Créer le transporter
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === 'true' || secure === true,
      auth: {
        user,
        pass,
      },
    });

    // Vérifier la connexion
    logger.info('[TEST-EMAIL] Vérification connexion SMTP...');
    await transporter.verify();
    logger.info('[TEST-EMAIL] ✅ Connexion SMTP réussie');

    // Envoyer l'email de test
    logger.info('[TEST-EMAIL] Envoi email de test...');
    const info = await transporter.sendMail({
      from: `"Atelier Vélo+" <${from}>`,
      to: testEmail,
      subject: '✅ Test de configuration email réussi - Atelier Vélo+',
      text: `Félicitations !

Votre configuration email est correcte et fonctionne.

Détails de la configuration testée:
- Serveur SMTP: ${host}
- Port: ${port}
- Sécurisé: ${secure}
- Utilisateur: ${user}
- Email expéditeur: ${from}

Vous pouvez maintenant envoyer des factures, devis et notifications par email depuis Atelier Vélo+.

---
Atelier Vélo+
Gestion d'atelier vélo simplifiée`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ Test de configuration email réussi!</h2>
          
          <p>Félicitations ! Votre configuration email est correcte et fonctionne.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Détails de la configuration testée:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>📧 <strong>Serveur SMTP:</strong> ${host}</li>
              <li>🔌 <strong>Port:</strong> ${port}</li>
              <li>🔒 <strong>Sécurisé:</strong> ${secure}</li>
              <li>👤 <strong>Utilisateur:</strong> ${user}</li>
              <li>✉️ <strong>Email expéditeur:</strong> ${from}</li>
            </ul>
          </div>
          
          <p>Vous pouvez maintenant envoyer des factures, devis et notifications par email depuis <strong>Atelier Vélo+</strong>.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Atelier Vélo+</strong><br>
            Gestion d'atelier vélo simplifiée
          </p>
        </div>
      `,
    });

    logger.info('[TEST-EMAIL] ✅ Email envoyé:', { messageId: info.messageId });

    return NextResponse.json({
      success: true,
      message: 'Email de test envoyé avec succès!',
      messageId: info.messageId,
      accepted: info.accepted,
    });

  } catch (error) {
    logger.error('[TEST-EMAIL] ❌ Erreur:', error);

    // Messages d'erreur plus explicites
    const err = error as NodemailerError;
    let errorMessage = err.message || 'Erreur inconnue';
    let errorDetails = '';

    if (err.code === 'EAUTH') {
      errorMessage = 'Échec de l\'authentification';
      errorDetails = 'Vérifiez votre email et mot de passe d\'application. Pour Gmail, assurez-vous d\'utiliser un "App Password" et non votre mot de passe Gmail.';
    } else if (err.code === 'ECONNECTION') {
      errorMessage = 'Impossible de se connecter au serveur SMTP';
      errorDetails = 'Vérifiez l\'adresse du serveur et le port. Pour Gmail: smtp.gmail.com:587';
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = 'Délai d\'attente dépassé';
      errorDetails = 'Le serveur SMTP ne répond pas. Vérifiez votre connexion internet et les paramètres du pare-feu.';
    } else if (err.responseCode === 535) {
      errorMessage = 'Authentification refusée';
      errorDetails = 'Email ou mot de passe incorrect. Pour Gmail, utilisez un App Password généré sur https://myaccount.google.com/apppasswords';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        code: err.code,
        responseCode: err.responseCode,
        command: err.command,
      },
      { status: 500 }
    );
  }
}
