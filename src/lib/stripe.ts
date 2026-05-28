/**
 * Helpers Stripe — éditeur (ventes de l'app) et atelier (Stripe Connect).
 *
 * Mode test/live piloté par STRIPE_MODE (défaut: déduit de NODE_ENV).
 * Toutes les clés viennent de process.env — jamais hardcodées.
 */
import Stripe from 'stripe';
import { logger } from './logger';

export type StripeMode = 'test' | 'live';

export function getStripeMode(): StripeMode {
  const explicit = process.env.STRIPE_MODE?.toLowerCase();
  if (explicit === 'live' || explicit === 'test') return explicit;
  return process.env.NODE_ENV === 'production' ? 'live' : 'test';
}

function readKey(name: string, fallback?: string): string {
  const v = process.env[name] || (fallback ? process.env[fallback] : '');
  if (!v) {
    throw new Error(`Stripe env var ${name} is missing`);
  }
  return v;
}

function getSecretKey(): string {
  const mode = getStripeMode();
  return mode === 'live'
    ? readKey('STRIPE_SECRET_KEY_LIVE', 'STRIPE_SECRET_KEY')
    : readKey('STRIPE_SECRET_KEY_TEST', 'STRIPE_SECRET_KEY');
}

export function getPublishableKey(): string {
  const mode = getStripeMode();
  return mode === 'live'
    ? readKey('STRIPE_PUBLISHABLE_KEY_LIVE', 'STRIPE_PUBLISHABLE_KEY')
    : readKey('STRIPE_PUBLISHABLE_KEY_TEST', 'STRIPE_PUBLISHABLE_KEY');
}

export function getWebhookSecret(): string {
  const mode = getStripeMode();
  return mode === 'live'
    ? readKey('STRIPE_WEBHOOK_SECRET_LIVE', 'STRIPE_WEBHOOK_SECRET')
    : readKey('STRIPE_WEBHOOK_SECRET_TEST', 'STRIPE_WEBHOOK_SECRET');
}

export function getConnectClientId(): string {
  const mode = getStripeMode();
  return mode === 'live'
    ? readKey('STRIPE_CONNECT_CLIENT_ID_LIVE', 'STRIPE_CONNECT_CLIENT_ID')
    : readKey('STRIPE_CONNECT_CLIENT_ID_TEST', 'STRIPE_CONNECT_CLIENT_ID');
}

/**
 * Mapping tier → price ID Stripe. Configurable par env (test/live distincts).
 */
export function getPriceIdForTier(tier: 'basique' | 'pro' | 'pro_lifetime'): string {
  const mode = getStripeMode();
  const suffix = mode === 'live' ? '_LIVE' : '_TEST';
  const map: Record<string, string> = {
    basique: process.env[`STRIPE_PRICE_BASIQUE${suffix}`] || process.env.STRIPE_PRICE_BASIQUE || '',
    pro: process.env[`STRIPE_PRICE_PRO${suffix}`] || process.env.STRIPE_PRICE_PRO || '',
    pro_lifetime: process.env[`STRIPE_PRICE_PRO_LIFETIME${suffix}`] || process.env.STRIPE_PRICE_PRO_LIFETIME || '',
  };
  const id = map[tier];
  if (!id) {
    throw new Error(`Missing Stripe price ID for tier "${tier}" in mode ${mode}`);
  }
  return id;
}

let cachedClient: Stripe | null = null;
let cachedMode: StripeMode | null = null;

/**
 * Client Stripe singleton (un par mode test/live).
 */
export function getStripeClient(): Stripe {
  const mode = getStripeMode();
  if (cachedClient && cachedMode === mode) return cachedClient;
  // Configuration minimale ; on omet apiVersion pour utiliser celle livrée par la lib Stripe.
  const config = {
    typescript: true,
    appInfo: { name: 'Atelier Vélo+', version: '1.1.0' },
  };
  cachedClient = new Stripe(getSecretKey(), config as ConstructorParameters<typeof Stripe>[1]);
  cachedMode = mode;
  logger.info('[stripe] Client initialized', { mode });
  return cachedClient;
}

export const PRICING_TIERS = [
  {
    tier: 'basique' as const,
    label: 'Basique',
    priceEUR: 199,
    period: 'an',
    bullets: [
      'Gestion clients / vélos / tickets',
      'Factures PDF illimitées',
      '30 emails par mois',
      'Toutes les bases métier',
    ],
    cta: 'Choisir Basique',
  },
  {
    tier: 'pro' as const,
    label: 'Pro',
    priceEUR: 359,
    period: 'an',
    bullets: [
      'Tout Basique inclus',
      'Envoi direct des PDF par email',
      'Emails illimités',
      'Statistiques avancées',
      'Module rendez-vous en ligne',
    ],
    cta: 'Choisir Pro',
    highlighted: true,
  },
  {
    tier: 'pro_lifetime' as const,
    label: 'Pro Lifetime',
    priceEUR: 599,
    period: 'achat unique',
    bullets: [
      'Pro à vie, jamais d’expiration',
      'Maintenance support 3 ans inclus',
      'Mises à jour incluses',
      'Idéal pour ateliers établis',
    ],
    cta: 'Choisir Pro Lifetime',
  },
];
