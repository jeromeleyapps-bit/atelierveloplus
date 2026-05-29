# Sprint 3 — Rapport (correction d'architecture : pas de serveur web)

Branche : `refonte-2026`. Tag : `sprint-3-done`.

## Contexte

Sprint 2 a été construit en partant d'une hypothèse fausse : qu'il y avait un serveur web hébergeant l'app Atelier Vélo+. En réalité, l'app est **100 % autonome** : elle s'installe sur le PC de chaque atelier, le seul usage externe étant le tunnel Cloudflare pour la prise de rendez-vous client.

Conséquence : tout ce qui supposait un endpoint public (webhook Stripe, OAuth Connect, endpoint redeem signant des licences) ne pouvait pas fonctionner. Sprint 3 corrige.

## Découpage

### S3.A — Atelier : saisie manuelle clés Stripe
- Schema `StripeConnection` repensé : `publishableKey` + `secretKeyEncrypted` (AES-256-GCM via `ENCRYPTION_KEY` existant) + `accountLabel` + `livemode`.
- Page `/admin/integrations/stripe` reconstruite en formulaire : l'atelier colle sa publishable key + sa restricted key Stripe (recommandé : `rk_*` avec permissions limitées au lieu de la `sk_*` master).
- Validation en ligne : POST appelle `stripe.balance.retrieve()` pour confirmer que les clés fonctionnent avant de persister.
- Suppression des routes OAuth `/api/integrations/stripe/{connect,callback}` (mortes hors-serveur).

### S3.B — Projet `workers/` Cloudflare
Nouveau sous-projet à la racine, à déployer indépendamment de l'app Electron.

- `workers/src/index.ts` : 4 routes (`POST /billing/checkout`, `GET /billing/order-status`, `POST /billing/webhook`, `POST /license/redeem`)
- `workers/src/license.ts` : signature RSA via Web Crypto API (équivalent edge du module Node)
- `workers/src/email.ts` : envoi d'email via API HTTP Resend (SMTP n'existe pas sur Workers)
- `workers/migrations/0001_init.sql` : schéma D1 SQLite pour `orders` + `purchase_tokens`
- `workers/wrangler.toml` : bindings D1 + environnements test / production
- `workers/README.md` : procédure complète de premier déploiement (D1 create, secrets, webhook Stripe)

Type-check `tsc --noEmit` passe à 0 erreur dans `workers/`.

La **clé privée RSA n'est plus jamais dans l'app cliente** — elle vit uniquement en secret Worker. L'app Electron n'a que la clé publique pour vérifier.

### S3.C — Page `/tarifs` statique → Cloudflare Pages
Nouveau sous-projet `pages-tarifs/` (HTML/JS vanilla, zéro dépendance).

- `pages-tarifs/index.html` : page tarifs publique avec 3 cards et email + bouton Checkout (POSTe vers le Worker)
- `pages-tarifs/success.html` : page de succès post-paiement (polling de l'order-status)
- `pages-tarifs/README.md` : doc déploiement Pages (drag & drop OU Git connect)

### S3.D — Nettoyage app Electron
Routes et fichiers déplacés vers `workers/` supprimés de l'app :
- `src/app/api/billing/*` (3 routes)
- `src/app/api/license/redeem/route.ts`
- `src/app/tarifs/` (page + success)
- `src/lib/stripe.ts` (lib éditeur)
- `src/lib/license-generator-server.ts` (signature serveur)
- `src/__tests__/lib/license-generator-server.test.ts`

Migration Prisma `drop_editor_models` : suppression des tables `Order` et `PurchaseToken` côté SQLite local — elles vivent désormais en D1 Cloudflare.

`RedeemPurchaseTokenCard` (sur `/admin/license`) pointe maintenant vers `${NEXT_PUBLIC_ATELIER_API_BASE}/license/redeem` (URL du Worker).

`.env.example` simplifié : plus de variables Stripe éditeur (vivent dans les secrets Worker), garde seulement `NEXT_PUBLIC_ATELIER_API_BASE`.

## Architecture finale

```
┌──────────────────────────────┐         ┌─────────────────────────────┐
│  Atelier Vélo+ (Electron)    │         │  Cloudflare Workers + Pages │
│  Installé sur PC atelier     │         │  Edge serverless            │
│                              │         │                             │
│  • App métier complète       │ POST    │  /billing/checkout          │
│  • SQLite local              │────────▶│  /billing/webhook ◀── Stripe│
│  • Stripe : clés atelier     │         │  /license/redeem            │
│    saisies, secret chiffré   │         │  D1 (orders, tokens)        │
│  • Sentry opt-in             │         │                             │
│  • Auto-update via R2        │         │  Pages: /tarifs (static)    │
└──────────────────────────────┘         └─────────────────────────────┘
         ▲
         │
    Cloudflare Tunnel (déjà en place pour la prise de RDV publique)
```

## Tests & lint
- **514 tests verts** (-6 du license-generator-server, déplacé vers `workers/`).
- ESLint `--max-warnings=0` vert.
- TypeScript clean côté app Electron ET côté Workers.

## Commits du sprint
```
3a0faa0a6 [s3] feat(workers+pages): Cloudflare Workers project + static /tarifs
9776f17ad [s3] refactor(stripe-atelier): manual restricted-key entry, encrypted, validated
<prochain commit> [s3] chore: cleanup obsolete editor routes/libs, drop Order/PurchaseToken models
<prochain commit> [s3] docs: Sprint 3 report
```

## Ce qu'il te reste à faire pour mettre en ligne

### 1. Workers
```bash
cd workers
npm install
wrangler login
wrangler d1 create atelier-velo-orders        # note le database_id, colle dans wrangler.toml
wrangler d1 migrations apply DB --local

# Définis les secrets (test d'abord)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_BASIQUE       # créés via scripts/setup-stripe-products.mjs
wrangler secret put STRIPE_PRICE_PRO
wrangler secret put STRIPE_PRICE_PRO_LIFETIME
wrangler secret put LICENSE_PRIVATE_KEY_PEM    # colle ton private-key.pem
wrangler secret put RESEND_API_KEY
wrangler secret put EMAIL_FROM                 # ex: contact@upgradedbikes.com
wrangler secret put APP_PUBLIC_URL             # ex: https://tarifs.tondomaine.fr

npm run deploy
```
Cloudflare te donne une URL `https://atelier-velo-api.XXX.workers.dev`.

### 2. Webhook Stripe
Dashboard Stripe → Developers → Webhooks → Add endpoint :
- URL : `https://atelier-velo-api.XXX.workers.dev/billing/webhook`
- Events : `checkout.session.completed`, `payment_intent.payment_failed`
- Stripe affiche un `whsec_…`, refais `wrangler secret put STRIPE_WEBHOOK_SECRET`, redéploie.

### 3. Pages
- Cloudflare Pages → drag & drop du dossier `pages-tarifs/`
- Édite `index.html` et `success.html` pour pointer `ATELIER_API_BASE` vers ton Worker
- Custom domain `tarifs.tondomaine.fr` (gratuit)

### 4. App Electron
Dans `.env.production` (intégré au build via electron-builder) :
```
NEXT_PUBLIC_ATELIER_API_BASE=https://atelier-velo-api.XXX.workers.dev
```
Sans cette variable, l'onglet « Activer un code d'achat » affiche un message d'erreur clair au lieu de planter.

### 5. Production
Quand tu es prêt à passer en LIVE :
- Recrée le projet workers en `--env production` avec les secrets `sk_live_`, `whsec_live_`, etc.
- `npm run deploy:prod`
- Update du `.env.production` Electron pour pointer vers le worker prod
- Rebuild Electron

## Retour arrière
```bash
git reset --hard sprint-3-done   # ou un tag antérieur
git checkout windows             # avant toute refonte
```

## Bilan global 4 sprints

| Sprint | Tag | Commits | Objectif |
|---|---|---|---|
| 0 | `sprint-0-done` | 8 | Sécurité d'urgence |
| 1 | `sprint-1-done` | 10 | Build, qualité, dette |
| 2 | `sprint-2-done` | 6 | Commercialisation (architecture erronée serveur) |
| 3 | `sprint-3-done` | 4 | Correction architecture serverless (Workers + Pages) |

**Total** : 28 commits, 514 tests verts, 0 warning ESLint, 0 erreur TypeScript, build Electron validé, projet Workers compilable, page statique prête à déployer.
