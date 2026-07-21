/**
 * Gardes du tier GRATUIT (freemium — juil. 2026).
 *
 * Le tier `free` (bascule automatique après le trial 14 j) est limité en volume :
 *   - FREE_LIMITS.maxCustomers        clients au total
 *   - FREE_LIMITS.maxTicketsPerMonth  tickets (work orders) créés par mois calendaire
 *   - FREE_LIMITS.maxEmailsPerMonth   emails (0 — déjà appliqué via maxEmailsPerMonth en DB)
 *
 * Les tiers payants (basique/pro/pro_lifetime) et le trial ne sont jamais limités ici.
 * Les messages d'erreur sont pensés pour la conversion : ils expliquent la limite
 * et pointent vers l'upgrade, sans jamais bloquer la consultation des données existantes.
 */
import { prisma } from './prisma';
import { getLicenseInfo, FREE_LIMITS } from './license-manager';
import { logger } from './logger';

export interface FreeTierCheck {
  allowed: boolean;
  /** Code machine pour l'UI (affichage bannière ciblée). */
  reason?: 'free_limit_customers' | 'free_limit_tickets';
  /** Message FR affichable tel quel. */
  message?: string;
  /** Utilisation courante / limite (pour jauges UI). */
  current?: number;
  limit?: number;
}

const OK: FreeTierCheck = { allowed: true };

async function isFreeTier(): Promise<boolean> {
  try {
    const info = await getLicenseInfo();
    return info.tier === 'free';
  } catch (error) {
    // En cas de doute (erreur licence), ne jamais bloquer un client payant.
    logger.warn('[FreeTier] License check failed — allowing action', { error: String(error) });
    return false;
  }
}

/** Vérifie si un nouveau client peut être créé (limite tier gratuit). */
export async function checkCanCreateCustomer(): Promise<FreeTierCheck> {
  if (!(await isFreeTier())) return OK;

  const count = await prisma.customer.count();
  if (count < FREE_LIMITS.maxCustomers) {
    return { ...OK, current: count, limit: FREE_LIMITS.maxCustomers };
  }

  return {
    allowed: false,
    reason: 'free_limit_customers',
    current: count,
    limit: FREE_LIMITS.maxCustomers,
    message:
      `Version gratuite : limite de ${FREE_LIMITS.maxCustomers} clients atteinte. ` +
      `Passez à la version Basique ou Pro pour un nombre de clients illimité.`,
  };
}

/** Vérifie si un nouveau ticket (work order) peut être créé ce mois-ci (limite tier gratuit). */
export async function checkCanCreateWorkOrder(): Promise<FreeTierCheck> {
  if (!(await isFreeTier())) return OK;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.workOrder.count({
    where: { createdAt: { gte: monthStart } },
  });
  if (count < FREE_LIMITS.maxTicketsPerMonth) {
    return { ...OK, current: count, limit: FREE_LIMITS.maxTicketsPerMonth };
  }

  return {
    allowed: false,
    reason: 'free_limit_tickets',
    current: count,
    limit: FREE_LIMITS.maxTicketsPerMonth,
    message:
      `Version gratuite : limite de ${FREE_LIMITS.maxTicketsPerMonth} tickets ce mois-ci atteinte. ` +
      `Passez à la version Basique ou Pro pour des réparations illimitées.`,
  };
}

/** Résumé d'utilisation pour l'UI (jauges de la bannière freemium). */
export async function getFreeTierUsage(): Promise<{
  isFree: boolean;
  customers?: { current: number; limit: number };
  ticketsThisMonth?: { current: number; limit: number };
}> {
  if (!(await isFreeTier())) return { isFree: false };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [customers, tickets] = await Promise.all([
    prisma.customer.count(),
    prisma.workOrder.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return {
    isFree: true,
    customers: { current: customers, limit: FREE_LIMITS.maxCustomers },
    ticketsThisMonth: { current: tickets, limit: FREE_LIMITS.maxTicketsPerMonth },
  };
}
