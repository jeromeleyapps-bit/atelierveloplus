import { buildFec } from '@/lib/fec-export';

const invoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  number: 'FAC-2026-0001',
  type: 'invoice',
  status: 'issued',
  issueDate: new Date('2026-01-15T00:00:00Z'),
  createdAt: new Date('2026-01-15T00:00:00Z'),
  subtotalHT: 100,
  vatAmount: 20,
  totalTTC: 120,
  InvoiceLine: [],
  ...overrides,
}) as unknown as Parameters<typeof import('@/lib/fec-export').buildFec>[0]['invoices'][number];

describe('buildFec', () => {
  it('produit un en-tête FEC à 18 colonnes pipe-séparées', () => {
    const csv = buildFec({ invoices: [invoice()], periodLabel: '2026-01' });
    const header = csv.split('\r\n')[0];
    expect(header.split('|')).toHaveLength(18);
    expect(header.startsWith('JournalCode|JournalLib|EcritureNum|EcritureDate|')).toBe(true);
  });

  it('génère 3 lignes pour une facture avec TVA (client, vente HT, TVA)', () => {
    const csv = buildFec({ invoices: [invoice()], periodLabel: '2026-01' });
    const rows = csv.trim().split('\r\n');
    // 1 header + 3 lignes écriture
    expect(rows).toHaveLength(4);
    expect(rows[1]).toContain('411000');
    expect(rows[1]).toContain('120,00'); // débit TTC
    expect(rows[2]).toContain('706000');
    expect(rows[2]).toContain('100,00'); // crédit HT
    expect(rows[3]).toContain('445710');
    expect(rows[3]).toContain('20,00');  // crédit TVA
  });

  it('génère 2 lignes pour une facture AE (TVA = 0)', () => {
    const csv = buildFec({
      invoices: [invoice({ vatAmount: 0, totalTTC: 100 })],
      periodLabel: '2026-01',
    });
    const rows = csv.trim().split('\r\n');
    expect(rows).toHaveLength(3); // header + 411 + 706
  });

  it('inverse les colonnes débit/crédit pour un avoir', () => {
    const csv = buildFec({
      invoices: [invoice({ type: 'credit', number: 'AVO-2026-0001' })],
      periodLabel: '2026-01',
    });
    const rows = csv.trim().split('\r\n');
    expect(rows[1]).toContain('411000');
    // Client crédité (avoir = remboursement) → débit doit être 0
    expect(rows[1]).toMatch(/411000.*\|0,00\|120,00/);
  });

  it('exclut les brouillons', () => {
    const csv = buildFec({
      invoices: [invoice({ status: 'draft' })],
      periodLabel: '2026-01',
    });
    const rows = csv.trim().split('\r\n');
    expect(rows).toHaveLength(1); // header seulement
  });
});
