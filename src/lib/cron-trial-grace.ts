/**
 * Cron Job: Trial + Grace Period Management - Phase 2.1 Option C
 * À exécuter quotidiennement à 2h du matin
 * 
 * OPTION C - GRACE PERIOD 7 JOURS:
 * J+0 à J+14: Trial actif (PRO gratuit)
 * J+14: Trial expire → Grace period démarre (7 jours) + Email 1
 * J+15: 1 jour après fin trial → Email 2 avec -20%
 * J+20: 1 jour avant blocage → Email 3 dernière chance
 * J+21: Fin grace → App BLOQUÉE (status expired)
 * 
 * EMAILS (3 seulement - pas quotidiens):
 * 1. J+14: "Votre essai est terminé - Grace period 7 jours"
 * 2. J+15: "Profitez de -20% pendant votre grace period"
 * 3. J+20: "⚠️ Dernière chance - Blocage demain!"
 */

import { prisma } from './prisma';
import { sendEmail } from './email-with-db-config';
import { renderEmailTemplate, formatDateForEmail, TEMPLATES } from './email-template-loader';

import { logger } from './logger';

// ============================================
// JOB 1: EXPIRED TRIALS → GRACE PERIOD
// ============================================

/**
 * Convertit les trials expirés en grace period (7 jours)
 */
export async function convertExpiredTrialsToGrace(): Promise<number> {
  logger.info('CRON GRACE: Checking for expired trials');
  
  try {
    const now = new Date();
    
    // Trouver trials expirés (trialEndsAt < now)
    const expiredTrials = await prisma.license.findMany({
      where: {
        tier: 'trial',
        status: 'active',
        trialEndsAt: {
          lt: now,
        },
      },
    });
    
    let converted = 0;
    
    for (const trial of expiredTrials) {
      // Calculer date fin grace period (7 jours)
      const gracePeriodEnds = new Date();
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
      
      await prisma.license.update({
        where: { id: trial.id },
        data: {
          status: 'grace', // Nouveau status
          gracePeriodEndsAt: gracePeriodEnds,
        },
      });
      
      logger.info('CRON GRACE: Trial converted to grace period', { value: { 
        licenseKey: trial.key, 
        endsAt: gracePeriodEnds.toLocaleDateString('fr-FR')
      } });
      
      // Envoyer Email 1: "Votre essai est terminé - Grace period 7 jours"
      try {
        const emailHtml = renderEmailTemplate(TEMPLATES.TRIAL_ENDED, {
          customerName: trial.customerName || 'Utilisateur',
          customerEmail: trial.customerEmail,
          gracePeriodEndsAt: formatDateForEmail(gracePeriodEnds),
          daysRemaining: 7,
          upgradeUrl: 'http://localhost:3000/admin/license/upgrade',
        });
        
        await sendEmail({
          to: trial.customerEmail,
          subject: 'Votre essai gratuit est terminé - 7 jours supplémentaires offerts',
          html: emailHtml,
        });
        
        logger.info('CRON GRACE: Trial ended email sent', { value: { email: trial.customerEmail } });
      } catch (emailError) {
        logger.error('CRON GRACE: Failed to send trial ended email', { email: trial.customerEmail, error: emailError });
      }
      
      converted++;
    }
    
    return converted;
  } catch (error) {
    logger.error('CRON GRACE: Error converting trials to grace', { error });
    return 0;
  }
}

// ============================================
// JOB 2: GRACE PERIOD EMAILS
// ============================================

/**
 * Envoie les emails pendant grace period (J+15 et J+20)
 */
export async function sendGracePeriodEmails(): Promise<void> {
  logger.info('CRON GRACE: Checking for grace period email triggers');
  
  try {
    const now = new Date();
    
    // EMAIL 2: J+15 (1 jour après début grace = 6 jours restants)
    const sixDaysFromNow = new Date(now);
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
    
    const gracePeriod6Days = await prisma.license.findMany({
      where: {
        status: 'grace',
        gracePeriodEndsAt: {
          gte: sixDaysFromNow,
          lt: new Date(sixDaysFromNow.getTime() + 24 * 60 * 60 * 1000), // +1 jour
        },
      },
    });
    
    for (const license of gracePeriod6Days) {
      try {
        const emailHtml = renderEmailTemplate(TEMPLATES.GRACE_OFFER, {
          customerName: license.customerName || 'Utilisateur',
          customerEmail: license.customerEmail,
          gracePeriodEndsAt: formatDateForEmail(license.gracePeriodEndsAt!),
          daysRemaining: 6,
          upgradeUrl: 'http://localhost:3000/admin/license/upgrade',
        });
        
        await sendEmail({
          to: license.customerEmail,
          subject: '🎁 Offre spéciale -20% pour vous!',
          html: emailHtml,
        });
        
        logger.info('CRON GRACE: Discount email sent', { value: { email: license.customerEmail, daysLeft: 6 } });
      } catch (emailError) {
        logger.error('CRON GRACE: Failed to send discount email', { email: license.customerEmail, error: emailError });
      }
    }
    
    // EMAIL 3: J+20 (1 jour avant blocage = 1 jour restant)
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    const gracePeriod1Day = await prisma.license.findMany({
      where: {
        status: 'grace',
        gracePeriodEndsAt: {
          gte: oneDayFromNow,
          lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    
    for (const license of gracePeriod1Day) {
      try {
        const emailHtml = renderEmailTemplate(TEMPLATES.LAST_CHANCE, {
          customerName: license.customerName || 'Utilisateur',
          customerEmail: license.customerEmail,
          gracePeriodEndsAt: formatDateForEmail(license.gracePeriodEndsAt!),
          daysRemaining: 1,
          upgradeUrl: 'http://localhost:3000/admin/license/upgrade',
        });
        
        await sendEmail({
          to: license.customerEmail,
          subject: '⚠️ URGENG - Votre application sera bloquée demain',
          html: emailHtml,
        });
        
        logger.info('CRON GRACE: Last chance email sent', { value: { email: license.customerEmail, daysLeft: 1 } });
      } catch (emailError) {
        logger.error('CRON GRACE: Failed to send last chance email', { email: license.customerEmail, error: emailError });
      }
    }
    
    logger.info('CRON GRACE: Email triggers processed', { value: { count: gracePeriod6Days.length + gracePeriod1Day.length } });
  } catch (error) {
    logger.error('CRON GRACE: Error sending grace emails', { error });
  }
}

// ============================================
// JOB 3: EXPIRED GRACE → BLOCAGE
// ============================================

/**
 * Bloque les licences dont la grace period est expirée
 */
export async function blockExpiredGracePeriods(): Promise<number> {
  logger.info('CRON GRACE: Checking for expired grace periods');
  
  try {
    const now = new Date();
    
    // Trouver grace periods expirées
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
      logger.warn('CRON GRACE: License blocked - grace period expired', { licenseKey: license.key });
      
      // Envoyer Email notification blocage
      try {
        if (license.customerEmail) {
          const tierName = license.tier === 'trial' ? 'Trial' : license.tier === 'pro' ? 'Pro' : 'Basique';
          await sendEmail({
            to: license.customerEmail,
            subject: `❌ Application bloquée - Grace period terminée`,
            html: `
              <h2>Application bloquée</h2>
              <p>Bonjour ${license.customerName || 'Utilisateur'},</p>
              <p>La grace period de votre licence ${tierName} est terminée. <strong>L'application est maintenant bloquée.</strong></p>
              <p>Pour débloquer l'application, vous devez activer une licence.</p>
              <p><a href="http://localhost:3000/admin/license/upgrade">Activer une licence</a></p>
              <p>Cordialement,<br>L'équipe Atelier Vélo+</p>
            `,
          });
          
          logger.info('CRON GRACE: Block notification email sent', { value: { 
            email: license.customerEmail 
          } });
        }
      } catch (emailError) {
        logger.error('CRON GRACE: Failed to send block email', { 
          email: license.customerEmail, 
          error: emailError 
        });
      }
    }
    
    return blocked;
  } catch (error) {
    logger.error('CRON GRACE: Error blocking expired grace', { error });
    return 0;
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
 * import { runDailyGraceJobs } from './cron-trial-grace';
 * import cron from 'node-cron';
 * 
 * cron.schedule('0 2 * * *', runDailyGraceJobs);  // Tous les jours à 2h
 * ```
 */
export async function runDailyGraceJobs(): Promise<void> {
  logger.info('CRON GRACE: Starting daily grace period jobs', { 
    time: new Date().toLocaleString('fr-FR') 
  });
  
  try {
    // 1. Convertir trials expirés en grace
    const converted = await convertExpiredTrialsToGrace();
    logger.info('CRON GRACE: Trials converted', { value: { count: converted } });
    
    // 2. Envoyer emails grace period (J+15 et J+20)
    await sendGracePeriodEmails();
    
    // 3. Bloquer grace periods expirées
    const blocked = await blockExpiredGracePeriods();
    logger.info('CRON GRACE: Licenses blocked', { value: { count: blocked } });
    
    logger.info('CRON GRACE: Daily grace period jobs completed successfully');
  } catch (error) {
    logger.error('CRON GRACE: Error in daily jobs', { error });
  }
}

// ============================================
// HELPER: FORCER TRANSITION (DEV/TEST)
// ============================================

/**
 * Force un trial spécifique à passer en grace period (pour tests)
 * NE PAS utiliser en production
 */
export async function forceTrialToGrace(licenseKey: string): Promise<void> {
  const license = await prisma.license.findUnique({
    where: { key: licenseKey },
  });
  
  if (!license || license.tier !== 'trial') {
    throw new Error('License not found or not a trial');
  }
  
  const gracePeriodEnds = new Date();
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7);
  
  await prisma.license.update({
    where: { id: license.id },
    data: {
      status: 'grace',
      gracePeriodEndsAt: gracePeriodEnds,
      trialEndsAt: new Date(), // Mark trial as ended
    },
  });
  
  logger.debug('DEV: Trial forced to grace period', { licenseKey });
}

/**
 * Force une grace period à expirer (pour tests)
 * NE PAS utiliser en production
 */
export async function forceGraceToExpired(licenseKey: string): Promise<void> {
  const license = await prisma.license.findUnique({
    where: { key: licenseKey },
  });
  
  if (!license || license.status !== 'grace') {
    throw new Error('License not found or not in grace period');
  }
  
  await prisma.license.update({
    where: { id: license.id },
    data: {
      status: 'expired',
      gracePeriodEndsAt: new Date(), // Mark as expired now
    },
  });
  
  logger.debug('DEV: Grace period forced to expired', { licenseKey });
}
