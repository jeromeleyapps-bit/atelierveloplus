import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll toggle prisma presence per test by changing getPrisma mock
let prismaEnabled = false;

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(async () => {
    if (!prismaEnabled) return null;
    return {
      catalogItem: {
        findMany: vi.fn(async ({ where, take }: any) => {
          const base = [
            { id: '1', name: 'Chaîne 11v', sku: 'chaine-11', category: 'PIECES', priceHT: 18, priceTTC: 21.6, vatRate: 20, updatedAt: new Date().toISOString() },
            { id: '2', name: 'Casque urbain', sku: 'casque-city', category: 'EQUIPEMENTS', priceHT: 40, priceTTC: 48, vatRate: 20, updatedAt: new Date().toISOString() },
          ];
          // naive filter based on where
          let list = base;
          if (where?.category) list = list.filter(it => it.category === where.category);
          if (where?.OR?.length) {
            const q = (where.OR[0]?.name?.contains || where.OR[1]?.sku?.contains || where.OR[2]?.id?.contains || '').toLowerCase();
            list = list.filter(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.id.toLowerCase().includes(q));
          }
          return list.slice(0, take || 20);
        })
      }
    } as any;
  })
}));

// Import after mocks
import * as route from '../../src/app/api/catalog/search/route';

function makeUrl(q?: string, category?: string, limit?: number) {
  const u = new URL('http://localhost/api/catalog/search');
  if (q) u.searchParams.set('q', q);
  if (category) u.searchParams.set('category', category);
  if (limit != null) u.searchParams.set('limit', String(limit));
  return u.toString();
}

describe('GET /api/catalog/search', () => {
  beforeEach(() => {
    prismaEnabled = false;
  });

  it('falls back to local search when prisma not available', async () => {
    const req = new Request(makeUrl('casque', undefined, 5));
    const res = await (route as any).GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('uses prisma when available and filters by q and category', async () => {
    prismaEnabled = true;
    const req = new Request(makeUrl('casque', 'EQUIPEMENTS', 10));
    const res = await (route as any).GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Only EQUIPEMENTS and matching 'casque'
    expect(data.every((it: any) => it.category === 'EQUIPEMENTS')).toBe(true);
    expect(data.some((it: any) => it.name.toLowerCase().includes('casque'))).toBe(true);
  });
});
