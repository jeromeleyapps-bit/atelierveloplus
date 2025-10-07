import { getPrisma } from "./db";

export interface PricingMargin {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  coefficient: number;
}

/**
 * Récupère toutes les marges configurées
 */
export async function getPricingMargins(): Promise<PricingMargin[]> {
  const prisma = await getPrisma();
  if (!prisma) return [];

  const margins = await prisma.pricingMargin.findMany({
    orderBy: { minPrice: 'asc' },
  });

  return margins;
}

/**
 * Calcule le prix de vente TTC à partir du prix d'achat HT
 * en appliquant la marge appropriée
 * 
 * @param purchasePriceHT Prix d'achat HT
 * @param margins Liste des marges (optionnel, sera chargé si non fourni)
 * @returns Prix de vente HT avec marge appliquée
 */
export async function calculateSellingPrice(
  purchasePriceHT: number,
  margins?: PricingMargin[]
): Promise<{ sellingPriceHT: number; coefficient: number; marginAmount: number }> {
  // Charger les marges si non fournies
  if (!margins) {
    margins = await getPricingMargins();
  }

  // Trouver la tranche de marge appropriée
  const applicableMargin = margins.find(
    (m) =>
      purchasePriceHT >= m.minPrice &&
      (m.maxPrice === null || purchasePriceHT < m.maxPrice)
  );

  // Si aucune marge trouvée, utiliser un coefficient par défaut de 2
  const coefficient = applicableMargin?.coefficient || 2;

  // Calculer le prix de vente
  const sellingPriceHT = purchasePriceHT * coefficient;
  const marginAmount = sellingPriceHT - purchasePriceHT;

  return {
    sellingPriceHT,
    coefficient,
    marginAmount,
  };
}

/**
 * Calcule le prix de vente pour plusieurs articles
 */
export async function calculateSellingPrices(
  items: Array<{ id: string; purchasePriceHT: number }>
): Promise<
  Array<{
    id: string;
    purchasePriceHT: number;
    sellingPriceHT: number;
    coefficient: number;
    marginAmount: number;
  }>
> {
  const margins = await getPricingMargins();

  return items.map((item) => {
    const applicableMargin = margins.find(
      (m) =>
        item.purchasePriceHT >= m.minPrice &&
        (m.maxPrice === null || item.purchasePriceHT < m.maxPrice)
    );

    const coefficient = applicableMargin?.coefficient || 2;
    const sellingPriceHT = item.purchasePriceHT * coefficient;
    const marginAmount = sellingPriceHT - item.purchasePriceHT;

    return {
      ...item,
      sellingPriceHT,
      coefficient,
      marginAmount,
    };
  });
}
