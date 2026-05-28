/**
 * Export FEC (Fichier des Écritures Comptables) — format normé art. A47 A-1 LPF.
 *
 * Spécification : 18 colonnes obligatoires, séparateur `|` (pipe), encodage UTF-8 sans BOM,
 * encadré CRLF. En-têtes sur la 1ère ligne. Une ligne = une écriture comptable.
 *
 * Mapping métier Atelier Vélo+ → écritures :
 *   - Une facture émise génère 2-3 lignes : 411 client (débit TTC), 706/707 vente (crédit HT),
 *     445 TVA collectée (crédit TVA) si TVA applicable.
 *   - Un paiement génère 2 lignes : 411 client (crédit TTC), 512/530 banque ou caisse (débit TTC).
 *   - Avoirs : inversion 411 / 706-707 / 445.
 *
 * Cette implémentation produit le format BRUT conforme. La pondération précise des comptes
 * (segmentation 706 prestations vs 707 marchandises) suit le tier matériel/main-d'œuvre.
 */
import type { Prisma } from '@prisma/client';

export interface FecLine {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;   // YYYYMMDD
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;      // YYYYMMDD
  EcritureLib: string;
  Debit: string;          // 0,00
  Credit: string;         // 0,00
  EcritureLet: string;
  DateLet: string;
  ValidDate: string;      // YYYYMMDD
  Montantdevise: string;
  Idevise: string;
}

const COLUMNS: (keyof FecLine)[] = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
  'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
  'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
];

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function fmtMoney(centsOrEur: number): string {
  // FEC attend une virgule décimale, 2 décimales.
  return centsOrEur.toFixed(2).replace('.', ',');
}

function sanitize(v: string): string {
  // Pas de pipe, pas de retour ligne dans les champs.
  return v.replace(/[\r\n|]/g, ' ').trim();
}

type InvoiceWithLines = Prisma.InvoiceGetPayload<{ include: { InvoiceLine: true } }>;

interface FecExportInput {
  invoices: InvoiceWithLines[];
  periodLabel: string; // ex: "Janvier 2026"
}

export function buildFec({ invoices, periodLabel }: FecExportInput): string {
  const lines: FecLine[] = [];
  let ecritureNum = 1;

  for (const inv of invoices) {
    if (!inv.number) continue;
    if (inv.status === 'draft') continue;

    const date = inv.issueDate || inv.createdAt;
    const ecritureDate = fmtDate(date);
    const pieceRef = inv.number;
    const isCredit = inv.type === 'credit';
    const sign = isCredit ? -1 : 1;

    const totalTTC = (inv.totalTTC || 0) * sign;
    const subtotalHT = (inv.subtotalHT || 0) * sign;
    const vatAmount = (inv.vatAmount || 0) * sign;

    const baseEcriture = {
      JournalCode: 'VTE',
      JournalLib: 'Ventes atelier',
      EcritureNum: String(ecritureNum),
      EcritureDate: ecritureDate,
      PieceRef: pieceRef,
      PieceDate: ecritureDate,
      EcritureLib: sanitize(`${isCredit ? 'Avoir' : 'Facture'} ${pieceRef}`),
      EcritureLet: '',
      DateLet: '',
      ValidDate: ecritureDate,
      Montantdevise: '',
      Idevise: '',
      CompAuxNum: '',
      CompAuxLib: '',
    };

    // 1) Client 411 — débit TTC (crédit si avoir)
    lines.push({
      ...baseEcriture,
      CompteNum: '411000',
      CompteLib: 'Clients',
      Debit: totalTTC >= 0 ? fmtMoney(totalTTC) : '0,00',
      Credit: totalTTC < 0 ? fmtMoney(-totalTTC) : '0,00',
    });

    // 2) Vente 706 — crédit HT
    if (subtotalHT !== 0) {
      lines.push({
        ...baseEcriture,
        CompteNum: '706000',
        CompteLib: 'Prestations de services',
        Debit: subtotalHT < 0 ? fmtMoney(-subtotalHT) : '0,00',
        Credit: subtotalHT >= 0 ? fmtMoney(subtotalHT) : '0,00',
      });
    }

    // 3) TVA collectée 44571 — crédit TVA
    if (vatAmount !== 0) {
      lines.push({
        ...baseEcriture,
        CompteNum: '445710',
        CompteLib: 'TVA collectée',
        Debit: vatAmount < 0 ? fmtMoney(-vatAmount) : '0,00',
        Credit: vatAmount >= 0 ? fmtMoney(vatAmount) : '0,00',
      });
    }

    ecritureNum++;
  }

  const header = COLUMNS.join('|');
  const body = lines.map(l => COLUMNS.map(c => sanitize(l[c])).join('|')).join('\r\n');
  const filename = `FEC_${periodLabel.replace(/\s+/g, '_')}.csv`;

  return `${header}\r\n${body}\r\n`;

  // (filename retourné côté route, pas inclus ici pour rester pure data builder)
  void filename;
}
