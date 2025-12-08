import { requestLocal } from './api';
import { logger } from '@/lib/logger';

export type CatalogCategory = 'PIECES' | 'EQUIPEMENTS' | 'AUTRES';
export type CatalogItem = {
  id: string;
  category: CatalogCategory;
  name: string;
  priceHT: number;
  priceTTC: number;
  vatRate: number;
  sku?: string;
  stockQty?: number;
};

export const FALLBACK: CatalogItem[] = [
  { id: 'p-chaine', category: 'PIECES', name: 'Chaîne 11v', priceHT: 18.0, priceTTC: 21.6, vatRate: 20 },
  { id: 'p-pneu', category: 'PIECES', name: 'Pneu 700x32', priceHT: 16.5, priceTTC: 19.8, vatRate: 20 },
  { id: 'e-casque', category: 'EQUIPEMENTS', name: 'Casque urbain', priceHT: 40.0, priceTTC: 48.0, vatRate: 20 },
  { id: 'aut-1', category: 'AUTRES', name: 'Carte cadeau atelier', priceHT: 50.0, priceTTC: 60.0, vatRate: 20 },
];

export async function searchCatalog(params: { q?: string; category?: CatalogCategory; limit?: number }): Promise<CatalogItem[]> {
  const { q = '', category, limit = 20 } = params || {};
  const qp = `?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}&limit=${limit}`;
  // 1) Try local Next.js API route with JWT
  try {
    const data = await requestLocal(`/catalog/search${qp}`);
    if (Array.isArray(data)) return data as CatalogItem[];
  } catch (e) {
    logger.error('[searchCatalog] Error:', e);
  }

  // 2) Fallback local filtering
  const needle = q.trim().toLowerCase();
  let list = FALLBACK;
  if (category) list = list.filter((i) => i.category === category);
  if (needle) list = list.filter((i) => i.name.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle));
  return list.slice(0, limit);
}

export function searchCatalogLocal(params: { q?: string; category?: CatalogCategory; limit?: number }): CatalogItem[] {
  const { q = '', category, limit = 20 } = params || {};
  const needle = q.trim().toLowerCase();
  let list = FALLBACK;
  if (category) list = list.filter((i) => i.category === category);
  if (needle) list = list.filter((i) => i.name.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle));
  return list.slice(0, limit);
}
