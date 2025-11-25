/**
 * Scheduler - Cron Jobs Phase 1 Communications + Phase 2.1 Grace Period
 * Jobs quotidiens pour emails automatiques
 */

import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { runDailyGraceJobs } from './cron-trial-grace';
import { runDailyLicenseExpirationJobs } from './cron-license-expiration';
import { logger } from './logger';

/**
 * Job 1: Envoyer emails satisfaction J+2 après réparation
 * Déclenché quotidiennement à 9h
 */
export async function sendSatisfactionEmails() {
  logger.info('CRON: Job satisfaction emails started');

  try {
    // Date J-2 (il y a 2 jours)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const threeDaysAgo = new Date(twoDaysAgo);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 1);

    // Trouver WorkOrders complétés il y a 2 jours ET email pas encore envoyé
    const workOrders = await prisma.workOrder.findMany({
      where: {
        completedAt: {
          gte: twoDaysAgo,
          lt: threeDaysAgo,
        },
        satisfactionEmailSent: false,
        customerId: {
          not: null,
        },
      },
      include: {
        Customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            marketingOptIn: true,
          },
        },
        CustomerBike: {
          select: {
            brand: true,
            model: true,
          },
        },
      },
      take: 50, // Limite sécurité
    });

    logger.info('CRON: Found work orders for satisfaction emails', { count: workOrders.length });

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const wo of workOrders) {
      try {
        // Vérifier opt-in marketing
        if (!wo.Customer?.marketingOptIn) {
          logger.debug('CRON: Skipping work order - client opted out', { workOrderId: wo.id });
          skipped++;
          continue;
        }

        // Vérifier email présent
        if (!wo.Customer?.email) {
          logger.debug('CRON: Skipping work order - no email', { workOrderId: wo.id });
          skipped++;
          
          // Marquer comme envoyé pour ne pas réessayer
          await prisma.workOrder.update({
            where: { id: wo.id },
            data: { 
              satisfactionEmailSent: true,
              satisfactionEmailSentAt: new Date(),
            },
          });
          continue;
        }

        // Appeler API Communications
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/communications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'email',
            event: 'satisfaction_followup',
            customerId: wo.customerId,
            workOrderId: wo.id,
            data: {
              surveyLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/survey/${wo.id}`,
              promoCode: 'MERCI10',
            },
          }),
        });

        if (response.ok) {
          // Marquer comme envoyé
          await prisma.workOrder.update({
            where: { id: wo.id },
            data: {
              satisfactionEmailSent: true,
              satisfactionEmailSentAt: new Date(),
            },
          });

          logger.info('CRON: Satisfaction email sent', { workOrderId: wo.id });
          sent++;
        } else {
          const error = await response.text();
          logger.error('CRON: Failed to send satisfaction email', { workOrderId: wo.id, error });
          errors++;
        }

        // Pause 100ms entre chaque email (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('CRON: Error processing work order', { workOrderId: wo.id, error });
        errors++;
      }
    }

    logger.info('CRON: Satisfaction emails summary', { sent, skipped, errors });
    return { sent, skipped, errors };

  } catch (error) {
    logger.error('CRON: Fatal error in satisfaction emails job', { error });
    throw error;
  }
}

/**
 * Job 2: Envoyer rappels maintenance 6 mois
 * Déclenché quotidiennement à 9h
 */
export async function sendMaintenanceReminders() {
  logger.info('CRON: Job maintenance reminders started');

  try {
    // Date il y a 6 mois
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const sevenMonthsAgo = new Date(sixMonthsAgo);
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 1);

    // Trouver clients avec lastServiceDate il y a 6 mois ET reminder pas envoyé
    const customers = await prisma.customer.findMany({
      where: {
        lastServiceDate: {
          gte: sevenMonthsAgo,
          lte: sixMonthsAgo,
        },
        maintenanceReminderSent: false,
        marketingOptIn: true,
        email: {
          not: null,
        },
      },
      include: {
        CustomerBike: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      take: 100, // Limite sécurité
    });

    logger.info('CRON: Found customers for maintenance reminders', { count: customers.length });

    let sent = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        // Calculer mois depuis dernier service
        const monthsSince = customer.lastServiceDate
          ? Math.round((Date.now() - customer.lastServiceDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 6;

        // Appeler API Communications
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/communications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'email',
            event: 'maintenance_reminder',
            customerId: customer.id,
            data: {
              bookingLink: `${process.env.NEXT_PUBLIC_BOOKING_URL || 'https://rdv.upgradedbikes.com'}`,
              monthsSinceService: monthsSince,
            },
          }),
        });

        if (response.ok) {
          // Marquer comme envoyé
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              maintenanceReminderSent: true,
              maintenanceReminderSentAt: new Date(),
            },
          });

          logger.info('CRON: Maintenance reminder sent', { customerId: customer.id });
          sent++;
        } else {
          const error = await response.text();
          logger.error('CRON: Failed to send maintenance reminder', { customerId: customer.id, error });
          errors++;
        }

        // Pause 100ms entre chaque email (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error('CRON: Error processing customer', { customerId: customer.id, error });
        errors++;
      }
    }

    logger.info('CRON: Maintenance reminders summary', { sent, errors });
    return { sent, errors };

  } catch (error) {
    logger.error('CRON: Fatal error in maintenance reminders job', { error });
    throw error;
  }
}

/**
 * Job combiné quotidien
 * Exécute tous les jobs en séquence
 */
export async function runDailyJobs() {
  logger.info('CRON: Daily jobs started');
  
  const startTime = Date.now();

  try {
    // Job 1: Satisfaction emails
    const satisfactionResult = await sendSatisfactionEmails();
    
    // Job 2: Maintenance reminders
    const maintenanceResult = await sendMaintenanceReminders();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.info('CRON: Daily jobs completed', { 
      duration: `${duration}s`,
      totalEmails: satisfactionResult.sent + maintenanceResult.sent
    });

    return {
      satisfaction: satisfactionResult,
      maintenance: maintenanceResult,
      duration,
    };

  } catch (error) {
    logger.error('CRON: Fatal error in daily jobs', { error });
    throw error;
  }
}

/**
 * Démarrer le scheduler
 * Cron: Tous les jours à 9h00 (communications) + 2h00 (grace period)
 */
export function startScheduler() {
  logger.info('SCHEDULER: Starting cron schedulers');

  // Cron 1: Communications quotidiennes à 9h00
  const dailyJob = cron.schedule('0 9 * * *', async () => {
    try {
      await runDailyJobs();
    } catch (error) {
      logger.error('SCHEDULER: Error in daily job cron', { error });
    }
  }, {
    timezone: 'Europe/Paris',
  });

  logger.info('SCHEDULER: Communications cron activated', { schedule: '9h Europe/Paris' });

  // Cron 2: Grace Period Trial quotidien à 2h00 (Phase 2.1)
  const graceJob = cron.schedule('0 2 * * *', async () => {
    try {
      await runDailyGraceJobs();
    } catch (error) {
      logger.error('SCHEDULER: Error in grace period cron', { error });
    }
  }, {
    timezone: 'Europe/Paris',
  });

  logger.info('SCHEDULER: Grace period cron activated', { schedule: '2h Europe/Paris' });

  // Cron 3: Expiration Pro/Basique + Notifications quotidien à 2h30 (Phase 2.1)
  const expirationJob = cron.schedule('30 2 * * *', async () => {
    try {
      await runDailyLicenseExpirationJobs();
    } catch (error) {
      logger.error('SCHEDULER: Error in license expiration cron', { error });
    }
  }, {
    timezone: 'Europe/Paris',
  });

  logger.info('SCHEDULER: License expiration cron activated', { schedule: '2h30 Europe/Paris' });

  // Job immédiat au démarrage (si avant 9h30 et pas encore exécuté aujourd'hui)
  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || (hour === 9 && now.getMinutes() < 30)) {
    logger.info('SCHEDULER: Running immediate daily jobs');
    runDailyJobs().catch(error => {
      logger.error('SCHEDULER: Error in immediate job', { error });
    });
  }

  return { dailyJob, graceJob, expirationJob };
}

/**
 * Exporter pour tests manuels
 */
export const scheduler = {
  startScheduler,
  runDailyJobs,
  sendSatisfactionEmails,
  sendMaintenanceReminders,
  runDailyGraceJobs, // Phase 2.1
};
