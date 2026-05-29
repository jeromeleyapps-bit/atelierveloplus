#!/usr/bin/env node
/**
 * Crée les 3 produits + prix Atelier Vélo+ sur Stripe (mode TEST ou LIVE).
 *
 * Usage :
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.mjs
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe-products.mjs
 *
 * À la fin, ce script affiche les `STRIPE_PRICE_*_TEST` ou `_LIVE` à coller dans `.env`.
 */
import Stripe from 'stripe';

const sk = process.env.STRIPE_SECRET_KEY;
if (!sk) {
  console.error('Manque STRIPE_SECRET_KEY (sk_test_… ou sk_live_…)');
  process.exit(1);
}

const isLive = sk.startsWith('sk_live_');
const stripe = new Stripe(sk);

const TIERS = [
  {
    key: 'basique',
    name: 'Atelier Vélo+ Basique',
    description: 'Gestion atelier, factures PDF, 30 emails/mois — licence 1 an.',
    priceCents: 19900,
  },
  {
    key: 'pro',
    name: 'Atelier Vélo+ Pro',
    description: 'Tout Basique + envoi direct PDF, emails illimités, stats avancées, RDV en ligne — licence 1 an.',
    priceCents: 35900,
  },
  {
    key: 'pro_lifetime',
    name: 'Atelier Vélo+ Pro Lifetime',
    description: 'Atelier Vélo+ Pro à vie, maintenance et mises à jour 3 ans incluses.',
    priceCents: 59900,
  },
];

async function main() {
  const out = {};
  for (const t of TIERS) {
    const existingProducts = await stripe.products.search({
      query: `metadata['atelierVelo']:'${t.key}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`✓ Produit existant pour ${t.key}: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: t.name,
        description: t.description,
        metadata: { atelierVelo: t.key },
      });
      console.log(`✓ Produit créé pour ${t.key}: ${product.id}`);
    }

    const prices = await stripe.prices.list({ product: product.id, active: true });
    const matching = prices.data.find(
      (p) => p.unit_amount === t.priceCents && p.currency === 'eur' && !p.recurring,
    );
    let price;
    if (matching) {
      price = matching;
      console.log(`  ↳ Prix existant: ${price.id} (${(t.priceCents / 100).toFixed(2)} €)`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: t.priceCents,
        currency: 'eur',
        nickname: `${t.name} — paiement unique`,
      });
      console.log(`  ↳ Prix créé: ${price.id} (${(t.priceCents / 100).toFixed(2)} €)`);
    }
    out[t.key] = price.id;
  }

  const suffix = isLive ? 'LIVE' : 'TEST';
  console.log('\n=== À coller dans ton .env ===');
  console.log(`STRIPE_PRICE_BASIQUE_${suffix}=${out.basique}`);
  console.log(`STRIPE_PRICE_PRO_${suffix}=${out.pro}`);
  console.log(`STRIPE_PRICE_PRO_LIFETIME_${suffix}=${out.pro_lifetime}`);
  console.log('==============================');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
