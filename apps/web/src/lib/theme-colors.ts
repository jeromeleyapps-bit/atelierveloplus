/**
 * Système de couleurs thématiques par section
 * Couleurs pastels distinctes pour Tickets, Devis, Factures, Avoirs
 */

export type PageTheme = 'ticket' | 'quote' | 'invoice' | 'credit';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  border: string;
  hover: string;
  text: string;
}

export const PAGE_THEMES: Record<PageTheme, ThemeColors> = {
  // Tickets - Bleu pastel (confiance, technique)
  ticket: {
    primary: '#64B5F6',        // Bleu clair
    primaryLight: '#E3F2FD',   // Bleu très clair
    primaryDark: '#42A5F5',    // Bleu moyen
    background: '#F5FAFF',     // Fond bleu très léger
    border: '#BBDEFB',         // Bordure bleu pastel
    hover: '#90CAF9',          // Hover bleu
    text: '#1976D2',           // Texte bleu foncé
  },

  // Devis - Violet pastel (créativité, proposition)
  quote: {
    primary: '#BA68C8',        // Violet clair
    primaryLight: '#F3E5F5',   // Violet très clair
    primaryDark: '#AB47BC',    // Violet moyen
    background: '#FAF5FF',     // Fond violet très léger
    border: '#E1BEE7',         // Bordure violet pastel
    hover: '#CE93D8',          // Hover violet
    text: '#7B1FA2',           // Texte violet foncé
  },

  // Factures - Vert pastel (validation, argent)
  invoice: {
    primary: '#81C784',        // Vert clair
    primaryLight: '#E8F5E9',   // Vert très clair
    primaryDark: '#66BB6A',    // Vert moyen
    background: '#F5FFF5',     // Fond vert très léger
    border: '#C8E6C9',         // Bordure vert pastel
    hover: '#A5D6A7',          // Hover vert
    text: '#388E3C',           // Texte vert foncé
  },

  // Avoirs - Orange pastel (attention, remboursement)
  credit: {
    primary: '#FFB74D',        // Orange clair
    primaryLight: '#FFF3E0',   // Orange très clair
    primaryDark: '#FFA726',    // Orange moyen
    background: '#FFFAF5',     // Fond orange très léger
    border: '#FFE0B2',         // Bordure orange pastel
    hover: '#FFCC80',          // Hover orange
    text: '#F57C00',           // Texte orange foncé
  },
};

/**
 * Obtenir les couleurs du thème pour une page
 */
export function getPageTheme(theme: PageTheme): ThemeColors {
  return PAGE_THEMES[theme];
}

/**
 * Détecter le thème depuis l'URL
 */
export function detectThemeFromPath(pathname: string): PageTheme {
  if (pathname.includes('/tickets')) return 'ticket';
  if (pathname.includes('/quotes') || pathname.includes('/devis')) return 'quote';
  if (pathname.includes('/invoices') || pathname.includes('/factures')) return 'invoice';
  if (pathname.includes('/credits') || pathname.includes('/avoirs')) return 'credit';
  return 'ticket'; // Par défaut
}
