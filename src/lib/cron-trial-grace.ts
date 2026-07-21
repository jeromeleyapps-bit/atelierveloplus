/**
 * Cron Job : fin de trial → bascule en version GRATUITE (freemium — juil. 2026)
 * À exécuter quotidiennement (via scheduler.ts, 2h du matin).
 *
 * ANCIEN FLUX (supprimé) : trial → grace 7 j → app BLOQUÉE.
 * NOUVEAU FLUX : J+14, le trial expire → l'utilisateur passe en version gratuite
 * (30 clients, 10 tickets/mois, pas d'emails). Données conservées, app jamais bloquée.
 * Un seul email est envoyé : bienvenue en version gratuite + invitation à upgrader.
 *
 * NOTE : la conversion elle-même est aussi faite en temps réel par
 * license-manager.checkAndDowngradeExpiredTrials() (appelée à chaque getLicenseInfo).
 * Ce cron sert de filet de sécurité + porte l'envoi de l'email.
 */

import { prisma } from './prisma';
import { sendEmail } from './email-with-db-config';
import { FREE_LIMITS } from './license-manager';
import { logger } from './logger';

const PURCHASE_URL = process.env.NEXT_PUBLIC_PURCHASE_URL || 'https://tarifs.upgradedbikes.com';

/**
 * Convertit les trials expirés (et les trials bloqués/en grace de l'ancien flux)
 * en tier gratuit, et envoie l'email de bienvenue en version gratuite.
 * @returns nombre de licences converties
 */
export async function convertExpiredTrialsToFree(): Promise<number> {
  logger.info('CRON FREE: Checking for expired trials to convert to free tier');

  try {
    const now = new Date();

    const toConvert = await prisma.license.findMany({
      where: {
        tier: 'trial',
        OR: [
          { status: 'active', trialEndsAt: { lt: now } },
          { status: { in: ['grace', 'blocked'] } }, // legacy ancien flux
        ],
      },
    });

    let converted = 0;

    for (const trial of toConvert) {
      await prisma.license.update({
        where: { id: trial.id },
        data: {
          tier: 'free',
          status: 'active',
          gracePeriodEndsAt: null,
          maxEmailsPerMonth: FREE_LIMITS.maxEmailsPerMonth,
          marketingEnabled: false,
          bookingEnabled: false,
          advancedStatsEnabled: false,
          pdfDirectSendEnabled: false,
        },
      });

      logger.info('CRON FREE: Trial converted to free tier', { value: { licenseKey: trial.key } });

      // Email unique : bienvenue en version gratuite (ton positif, pas de menace de blocage)
      try {
        if (trial.customerEmail && !trial.customerEmail.endsWith('@trial.local')) {
          await sendEmail({
            to: trial.customerEmail,
            subject: 'Votre essai est terminé — vous passez en version gratuite',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <h2>Merci d'avoir essayé Atelier Vélo+ !</h2>
                <p>Bonjour ${trial.customerName || ''},</p>
                <p>Vos 14 jours d'essai de la version Pro sont terminés. Bonne nouvelle :
                <strong>vous continuez gratuitement</strong>, sans rien perdre. Toutes vos données
                (clients, tickets, factures) sont conservées.</p>
                <p>La version gratuite comprend :</p>
                <ul>
                  <li>Jusqu'à ${FREE_LIMITS.maxCustomers} clients</li>
                  <li>${FREE_LIMITS.maxTicketsPerMonth} tickets de réparation par mois</li>
                  <li>Devis et factures PDF, forfaits, acomptes, signature client</li>
                </ul>
                <p>Besoin de plus (clients illimités, envoi d'emails, rendez-vous en ligne,
                statistiques) ? Les licences démarrent à 199 €/an, sans abonnement mensuel :</p>
                <p style="text-align:center;margin:20px 0">
                  <a href="${PURCHASE_URL}"
                     style="display:inline-block;background:#1e6091;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">
                    Voir les formules
                  </a>
                </p>
                <p>Bonne route,<br>L'équipe Atelier Vélo+</p>
              </div>`,
          });
          logger.info('CRON FREE: Welcome-to-free email sent', { value: { email: trial.customerEmail } });
        }
      } catch (emailError) {
        logger.error('CRON FREE: Failed to send welcome-to-free email', {
          email: trial.customerEmail,
          error: emailError,
        });
      }

      converted++;
    }

    return converted;
  } catch (error) {
    logger.error('CRON FREE: Error converting trials to free', { error });
    return 0;
  }
}

/**
 * Job quotidien (appelé par scheduler.ts). Nom conservé pour compatibilité.
 */
export async function runDailyGraceJobs(): Promise<void> {
  logger.info('CRON FREE: Daily trial→free job started');
  try {
    const converted = await convertExpiredTrialsToFree();
    logger.info('CRON FREE: Daily job completed', { value: { converted } });
  } catch (error) {
    logger.error('CRON FREE: Error in daily job', { error });
  }
}
