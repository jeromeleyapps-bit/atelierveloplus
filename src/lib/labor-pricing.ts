/**
 * labor-pricing.ts - Calcul standardisé du coût de la main d'œuvre
 * 
 * RÈGLE D'OR: Centraliser la logique métier (DRY)
 * 
 * Cette fonction est utilisée par:
 * - POST /api/finance/quotes (génération devis)
 * - POST /api/pos/workorders/[id]/sale (facture directe)
 * 
 * RÈGLE MÉTIER:
 * Facturation par tranches de 30 minutes
 * - 1-30 min → 0.5h facturée
 * - 31-60 min → 1h facturée
 * - 61-90 min → 1.5h facturée
 * - etc.
 */

import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Résultat du calcul du coût de la main d'œuvre
 */
export interface LaborCostResult {
  /** Heures facturables (par tranches de 30 min) */
  billableHours: number;
  /** Tarif horaire appliqué (€/h) */
  hourlyRate: number;
  /** Coût total HT (€) */
  laborCostHT: number;
}

/**
 * Calcule le coût de la main d'œuvre avec facturation par tranches de 30 min
 * 
 * @param estimatedMinutes - Durée en minutes du travail (workOrder.estimatedMinutes)
 * @param workOrderHourlyRate - Tarif horaire spécifique du workOrder (optionnel)
 * @returns { billableHours, hourlyRate, laborCostHT }
 * 
 * @example
 * // 25 minutes → 0.5h × 60€/h = 30€
 * const result = await calculateLaborCost(25, null);
 * // result = { billableHours: 0.5, hourlyRate: 60, laborCostHT: 30 }
 * 
 * @example
 * // 45 minutes → 1h × 60€/h = 60€
 * const result = await calculateLaborCost(45, null);
 * // result = { billableHours: 1, hourlyRate: 60, laborCostHT: 60 }
 * 
 * @example
 * // 75 minutes → 1.5h × 50€/h = 75€ (tarif personnalisé)
 * const result = await calculateLaborCost(75, 50);
 * // result = { billableHours: 1.5, hourlyRate: 50, laborCostHT: 75 }
 */
export async function calculateLaborCost(
  estimatedMinutes: number | null | undefined,
  workOrderHourlyRate?: number | null
): Promise<LaborCostResult> {
  // Valeur par défaut si pas de minutes
  if (!estimatedMinutes || estimatedMinutes <= 0) {
    return {
      billableHours: 0,
      hourlyRate: 60, // Défaut
      laborCostHT: 0,
    };
  }

  // 1. Récupérer tarif horaire
  let hourlyRate = workOrderHourlyRate || 60; // Défaut 60€/h
  
  if (!workOrderHourlyRate) {
    // Lire depuis GlobalSetting si pas de tarif spécifique
    const prisma = await getPrisma();
    if (prisma) {
      try {
        const hourlyRateSetting = await prisma.globalSetting.findUnique({
          where: { key: 'pricing.hourlyRate' },
        });
        
        if (hourlyRateSetting?.value) {
          const parsedRate = Number(hourlyRateSetting.value);
          if (!isNaN(parsedRate) && parsedRate > 0) {
            hourlyRate = parsedRate;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[labor-pricing] Error reading hourlyRate setting:', { error: errorMessage });
        // Continuer avec valeur par défaut
      }
    }
  }

  // 2. Calculer heures facturables par tranches de 30 min
  // Formule: Math.ceil(minutes / 30) * 0.5
  // Exemples:
  // - 1-30 min → ceil(30/30) * 0.5 = 1 * 0.5 = 0.5h
  // - 31-60 min → ceil(60/30) * 0.5 = 2 * 0.5 = 1h
  // - 61-90 min → ceil(90/30) * 0.5 = 3 * 0.5 = 1.5h
  const billableHours = Math.ceil(estimatedMinutes / 30) * 0.5;

  // 3. Calculer coût HT
  const laborCostHT = billableHours * hourlyRate;

  return {
    billableHours,
    hourlyRate,
    laborCostHT,
  };
}

/**
 * Formatte une durée en minutes en format lisible
 * 
 * @param minutes - Durée en minutes
 * @returns Format "Xh Ymin" ou "Ymin"
 * 
 * @example
 * formatDuration(25) // "25min"
 * formatDuration(75) // "1h 15min"
 * formatDuration(120) // "2h"
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0min';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}min`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}min`;
  }
}
