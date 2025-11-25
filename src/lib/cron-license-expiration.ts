/**
 * Cron Job: Gestion expiration licences Pro/Basique et notifications
 * À exécuter quotidiennement à 2h du matin
 * 
 * GESTION EXPIRATION PRO/BASIQUE:
 * - Pro/Basique expire (expiresAt < now) → Grace period 7 jours (si pas déjà en grace)
 * - Grace period expire (gracePeriodEndsAt < now) → Status 'expired' (blocage)
 * 
 * NOTIFICATIONS AVANT EXPIRATION (7j, 3j, 1j avant):
 * - Email à 7 jours avant expiration
 * - Email à 3 jours avant expiration
 * - Email à 1 jour avant expiration
 * 
 * NOTIFICATIONS FIN MAINTENANCE LIFETIME (7j, 3j, 1j avant):
 * - Email à 7 jours avant fin maintenance
 * - Email à 3 jours avant fin maintenance
 * - Email à 1 jour avant fin maintenance
 */

import { prisma } from './prisma';
import { sendEmail } from './email-with-db-config';
import { logger } from './logger';
import { formatDateForEmail } from './email-template-loader';

// ============================================
// JOB 1: EXPIRED PRO/BASIQUE → GRACE PERIOD
// ============================================

/**
 * Convertit les licences Pro/Basique expirées en grace period (7 jours)
 */
export async function convertExpiredProBasiqueToGrace(): Promise<number> {
  logger.info('CRON EXPIRATION: Checking for expired Pro/Basique licenses');
  
  try {
    const now = new Date();
    
    // Trouver licences Pro/Basique expirées (expiresAt < now) mais encore 'active'
    const expiredLicenses = await prisma.license.findMany({
      where: {
        tier: { in: ['pro', 'basique'] },
        status: 'active',
        expiresAt: {
          lt: now,
        },
        // Pas déjà en grace period
        gracePeriodEndsAt: null,
      },
    });
    
    let converted = 0;
    
    for (const license of expiredLicenses) {
      // Calculer date fin grace period (7 jours)
      const gracePeriodEnds = new Date();
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
      
      await prisma.license.update({
        where: { id: license.id },
        data: {
          status: 'grace', // Nouveau status
          gracePeriodEndsAt: gracePeriodEnds,
        },
      });
      
      logger.info('CRON EXPIRATION: License converted to grace period', { 
        licenseKey: license.key, 
        tier: license.tier,
        endsAt: gracePeriodEnds.toLocaleDateString('fr-FR') 
      });
      
      // Envoyer Email notification: "Votre licence a expiré - Grace period 7 jours"
      try {
        if (license.customerEmail) {
          const tierName = license.tier === 'pro' ? 'Pro' : 'Basique';
          await sendEmail({
            to: license.customerEmail,
            subject: `⚠️ Votre licence ${tierName} a expiré - Grace period de 7 jours activée`,
            html: `
              <h2>Votre licence ${tierName} a expiré</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre licence ${tierName} a expiré. Nous avons activé une <strong>grace period de 7 jours</strong> pour vous permettre de renouveler sans interruption.</p>
              <p><strong>Date limite de renouvellement:</strong> ${formatDateForEmail(gracePeriodEnds)}</p>
              <p>Renouvelez votre licence avant cette date pour éviter le blocage de l'application.</p>
              <p><a href="http://localhost:3000/admin/license/upgrade">Renouveler ma licence</a></p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: Expiration notification email sent', { 
            email: license.customerEmail, 
            tier: license.tier 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send expiration email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
      
      converted++;
    }
    
    return converted;
  } catch (error) {
    logger.error('CRON EXPIRATION: Error converting expired licenses to grace', { error });
    return 0;
  }
}

// ============================================
// JOB 2: EXPIRED GRACE → BLOCAGE
// ============================================

/**
 * Bloque les licences dont la grace period est expirée
 */
export async function blockExpiredGracePeriods(): Promise<number> {
  logger.info('CRON EXPIRATION: Checking for expired grace periods');
  
  try {
    const now = new Date();
    
    // Trouver grace periods expirées (gracePeriodEndsAt < now)
    const expiredGrace = await prisma.license.findMany({
      where: {
        status: 'grace',
        gracePeriodEndsAt: {
          lt: now,
        },
      },
    });
    
    let blocked = 0;
    
    for (const license of expiredGrace) {
      await prisma.license.update({
        where: { id: license.id },
        data: {
          status: 'expired', // Bloque l'app
        },
      });
      
      blocked++;
      logger.warn('CRON EXPIRATION: License blocked - grace period expired', { 
        licenseKey: license.key,
        tier: license.tier 
      });
      
      // Envoyer Email notification blocage
      try {
        if (license.customerEmail) {
          const tierName = license.tier === 'pro' ? 'Pro' : 'Basique';
          await sendEmail({
            to: license.customerEmail,
            subject: `❌ Application bloquée - Grace period terminée`,
            html: `
              <h2>Application bloquée</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>La grace period de votre licence ${tierName} est terminée. <strong>L'application est maintenant bloquée.</strong></p>
              <p>Pour débloquer l'application, vous devez renouveler votre licence.</p>
              <p><a href="http://localhost:3000/admin/license/upgrade">Renouveler ma licence</a></p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: Block notification email sent', { 
            email: license.customerEmail 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send block email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    return blocked;
  } catch (error) {
    logger.error('CRON EXPIRATION: Error blocking expired grace', { error });
    return 0;
  }
}

// ============================================
// JOB 3: NOTIFICATIONS AVANT EXPIRATION PRO/BASIQUE
// ============================================

/**
 * Envoie les emails de notification avant expiration (7j, 3j, 1j avant)
 */
export async function sendExpirationNotifications(): Promise<void> {
  logger.info('CRON EXPIRATION: Checking for expiration notification triggers');
  
  try {
    const now = new Date();
    
    // EMAIL 7 JOURS AVANT
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const licenses7Days = await prisma.license.findMany({
      where: {
        tier: { in: ['pro', 'basique'] },
        status: 'active',
        expiresAt: {
          gte: new Date(sevenDaysFromNow.getTime() - 24 * 60 * 60 * 1000), // -1 jour pour fenêtre
          lt: new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000), // +1 jour pour fenêtre
        },
      },
    });
    
    for (const license of licenses7Days) {
      // Vérifier si email déjà envoyé (éviter doublons)
      // TODO: Ajouter champ lastExpirationEmailSentAt dans schema License
      try {
        if (license.customerEmail && license.expiresAt) {
          const tierName = license.tier === 'pro' ? 'Pro' : 'Basique';
          await sendEmail({
            to: license.customerEmail,
            subject: `⏰ Votre licence ${tierName} expire dans 7 jours`,
            html: `
              <h2>Rappel: Votre licence expire bientôt</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre licence ${tierName} expire dans <strong>7 jours</strong> (le ${formatDateForEmail(license.expiresAt)}).</p>
              <p>Renouvelez maintenant pour éviter toute interruption de service.</p>
              <p><a href="http://localhost:3000/admin/license/upgrade">Renouveler ma licence</a></p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: 7-day expiration email sent', { 
            email: license.customerEmail, 
            tier: license.tier 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send 7-day email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    // EMAIL 3 JOURS AVANT
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const licenses3Days = await prisma.license.findMany({
      where: {
        tier: { in: ['pro', 'basique'] },
        status: 'active',
        expiresAt: {
          gte: new Date(threeDaysFromNow.getTime() - 24 * 60 * 60 * 1000),
          lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    for (const license of licenses3Days) {
      try {
        if (license.customerEmail && license.expiresAt) {
          const tierName = license.tier === 'pro' ? 'Pro' : 'Basique';
          await sendEmail({
            to: license.customerEmail,
            subject: `⚠️ Urgent: Votre licence ${tierName} expire dans 3 jours`,
            html: `
              <h2>Urgent: Votre licence expire dans 3 jours</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre licence ${tierName} expire dans <strong>3 jours</strong> (le ${formatDateForEmail(license.expiresAt)}).</p>
              <p>Renouvelez dès maintenant pour éviter l'interruption de service.</p>
              <p><a href="http://localhost:3000/admin/license/upgrade">Renouveler ma licence</a></p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: 3-day expiration email sent', { 
            email: license.customerEmail, 
            tier: license.tier 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send 3-day email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    // EMAIL 1 JOUR AVANT
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    const licenses1Day = await prisma.license.findMany({
      where: {
        tier: { in: ['pro', 'basique'] },
        status: 'active',
        expiresAt: {
          gte: new Date(oneDayFromNow.getTime() - 24 * 60 * 60 * 1000),
          lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    for (const license of licenses1Day) {
      try {
        if (license.customerEmail && license.expiresAt) {
          const tierName = license.tier === 'pro' ? 'Pro' : 'Basique';
          await sendEmail({
            to: license.customerEmail,
            subject: `🔥 Dernière chance: Votre licence ${tierName} expire demain!`,
            html: `
              <h2>🔥 Dernière chance!</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre licence ${tierName} expire <strong>demain</strong> (le ${formatDateForEmail(license.expiresAt)}).</p>
              <p><strong>Renouvelez maintenant pour éviter le blocage de l'application.</strong></p>
              <p><a href="http://localhost:3000/admin/license/upgrade">Renouveler ma licence</a></p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: 1-day expiration email sent', { 
            email: license.customerEmail, 
            tier: license.tier 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send 1-day email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    logger.info('CRON EXPIRATION: Expiration notifications processed', { 
      count: licenses7Days.length + licenses3Days.length + licenses1Day.length 
    });
  } catch (error) {
    logger.error('CRON EXPIRATION: Error sending expiration notifications', { error });
  }
}

// ============================================
// JOB 4: NOTIFICATIONS FIN MAINTENANCE LIFETIME
// ============================================

/**
 * Envoie les emails de notification avant fin maintenance Lifetime (7j, 3j, 1j avant)
 */
export async function sendMaintenanceEndNotifications(): Promise<void> {
  logger.info('CRON EXPIRATION: Checking for maintenance end notification triggers');
  
  try {
    const now = new Date();
    
    // EMAIL 7 JOURS AVANT
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const lifetime7Days = await prisma.license.findMany({
      where: {
        tier: 'pro_lifetime',
        status: 'active',
        maintenanceExpiresAt: {
          gte: new Date(sevenDaysFromNow.getTime() - 24 * 60 * 60 * 1000),
          lt: new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    for (const license of lifetime7Days) {
      try {
        if (license.customerEmail && license.maintenanceExpiresAt) {
          await sendEmail({
            to: license.customerEmail,
            subject: `⏰ Support prioritaire Pro Lifetime se termine dans 7 jours`,
            html: `
              <h2>Rappel: Fin du support prioritaire</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre support prioritaire Pro Lifetime se termine dans <strong>7 jours</strong> (le ${formatDateForEmail(license.maintenanceExpiresAt)}).</p>
              <p><strong>Important:</strong> Votre licence Pro Lifetime reste active à vie. L'application continuera de fonctionner normalement. Seul le support prioritaire prend fin.</p>
              <p>Pour renouveler le support prioritaire, contactez-nous.</p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: 7-day maintenance email sent', { 
            email: license.customerEmail 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send 7-day maintenance email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    // EMAIL 3 JOURS AVANT
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const lifetime3Days = await prisma.license.findMany({
      where: {
        tier: 'pro_lifetime',
        status: 'active',
        maintenanceExpiresAt: {
          gte: new Date(threeDaysFromNow.getTime() - 24 * 60 * 60 * 1000),
          lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    for (const license of lifetime3Days) {
      try {
        if (license.customerEmail && license.maintenanceExpiresAt) {
          await sendEmail({
            to: license.customerEmail,
            subject: `⚠️ Support prioritaire se termine dans 3 jours`,
            html: `
              <h2>Rappel: Fin du support prioritaire dans 3 jours</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre support prioritaire Pro Lifetime se termine dans <strong>3 jours</strong> (le ${formatDateForEmail(license.maintenanceExpiresAt)}).</p>
              <p><strong>Important:</strong> Votre licence Pro Lifetime reste active à vie. L'application continuera de fonctionner normalement. Seul le support prioritaire prend fin.</p>
              <p>Pour renouveler le support prioritaire, contactez-nous.</p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: 3-day maintenance email sent', { 
            email: license.customerEmail 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send 3-day maintenance email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    // EMAIL 1 JOUR AVANT
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    const lifetime1Day = await prisma.license.findMany({
      where: {
        tier: 'pro_lifetime',
        status: 'active',
        maintenanceExpiresAt: {
          gte: new Date(oneDayFromNow.getTime() - 24 * 60 * 60 * 1000),
          lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    for (const license of lifetime1Day) {
      try {
        if (license.customerEmail && license.maintenanceExpiresAt) {
          await sendEmail({
            to: license.customerEmail,
            subject: `📢 Support prioritaire se termine demain`,
            html: `
              <h2>Fin du support prioritaire demain</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>Votre support prioritaire Pro Lifetime se termine <strong>demain</strong> (le ${formatDateForEmail(license.maintenanceExpiresAt)}).</p>
              <p><strong>Important:</strong> Votre licence Pro Lifetime reste active à vie. L'application continuera de fonctionner normalement. Seul le support prioritaire prend fin.</p>
              <p>Pour renouveler le support prioritaire, contactez-nous.</p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON EXPIRATION: 1-day maintenance email sent', { 
            email: license.customerEmail 
          });
        }
      } catch (emailError) {
        logger.error('CRON EXPIRATION: Failed to send 1-day maintenance email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    logger.info('CRON EXPIRATION: Maintenance end notifications processed', { 
      count: lifetime7Days.length + lifetime3Days.length + lifetime1Day.length 
    });
  } catch (error) {
    logger.error('CRON EXPIRATION: Error sending maintenance end notifications', { error });
  }
}

// ============================================
// JOB COMBINÉ QUOTIDIEN
// ============================================

/**
 * Job principal à exécuter quotidiennement (recommandé: 2h du matin)
 * 
 * Usage dans scheduler.ts:
 * ```typescript
 * import { runDailyLicenseExpirationJobs } from './cron-license-expiration';
 * import cron from 'node-cron';
 * 
 * cron.schedule('0 2 * * *', runDailyLicenseExpirationJobs);  // Tous les jours à 2h
 * ```
 */
export async function runDailyLicenseExpirationJobs(): Promise<void> {
  logger.info('CRON EXPIRATION: Starting daily license expiration jobs', { 
    time: new Date().toLocaleString('fr-FR') 
  });
  
  try {
    // 1. Convertir Pro/Basique expirées en grace
    const converted = await convertExpiredProBasiqueToGrace();
    logger.info('CRON EXPIRATION: Licenses converted to grace', { count: converted });
    
    // 2. Bloquer grace periods expirées
    const blocked = await blockExpiredGracePeriods();
    logger.info('CRON EXPIRATION: Licenses blocked', { count: blocked });
    
    // 3. Envoyer notifications avant expiration Pro/Basique (7j, 3j, 1j)
    await sendExpirationNotifications();
    
    // 4. Envoyer notifications fin maintenance Lifetime (7j, 3j, 1j)
    await sendMaintenanceEndNotifications();
    
    logger.info('CRON EXPIRATION: Daily license expiration jobs completed successfully');
  } catch (error) {
    logger.error('CRON EXPIRATION: Error in daily jobs', { error });
  }
}

