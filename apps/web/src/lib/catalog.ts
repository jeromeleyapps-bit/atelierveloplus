export type CatalogCategory = 'PIECES' | 'EQUIPEMENTS' | 'AUTRES';
export type CatalogItem = {
  id: string;
  category: CatalogCategory;
  name: string;
  priceHT: number;
  priceTTC: number;
  vatRate: number;
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
  // 1) Try local Next.js API route first
  try {
    const res = await fetch(`/api/catalog/search${qp}`, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as CatalogItem[];
    }
  } catch {}

  // 2) Try external API base if configured
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  if (base) {
    try {
      const res = await fetch(`${base}/catalog/search${qp}`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data as CatalogItem[];
      }
    } catch {}
  }

  // 3) Fallback local filtering
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
