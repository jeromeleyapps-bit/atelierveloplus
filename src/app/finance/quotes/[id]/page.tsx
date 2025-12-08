// Route alias pour les devis - réutilise la page facture
export { default } from '../../invoices/[id]/page';

// Next.js 16 ne permet pas de ré-exporter dynamic
export const dynamic = 'force-dynamic';
