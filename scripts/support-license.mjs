#!/usr/bin/env node
/**
 * Outil support éditeur — Atelier Vélo+.
 *
 * Permet de :
 *  - retrouver les commandes/codes d'un client par email
 *  - réinitialiser un code pour qu'un client puisse réactiver sa licence sur un nouveau PC
 *
 * Pré-requis : les variables d'env WORKER_URL et ADMIN_SECRET.
 *
 * Usage :
 *   set WORKER_URL=https://atelier-velo-api.upgradedbikes.workers.dev
 *   set ADMIN_SECRET=<le secret défini sur le Worker>
 *
 *   node scripts/support-license.mjs lookup client@email.com
 *   node scripts/support-license.mjs reset A1DB65F4BFBEF539F228CCC3
 */

const WORKER_URL = process.env.WORKER_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!WORKER_URL || !ADMIN_SECRET) {
  console.error('Manque WORKER_URL et/ou ADMIN_SECRET dans les variables d\'environnement.');
  process.exit(1);
}

const [, , cmd, arg] = process.argv;

async function lookup(email) {
  const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/support/lookup?email=${encodeURIComponent(email)}`, {
    headers: { 'x-admin-secret': ADMIN_SECRET },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

async function reset(token) {
  const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/support/reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

(async () => {
  if (cmd === 'lookup' && arg) return lookup(arg);
  if (cmd === 'reset' && arg) return reset(arg);
  console.log('Usage :');
  console.log('  node scripts/support-license.mjs lookup <email>');
  console.log('  node scripts/support-license.mjs reset <code>');
  process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
