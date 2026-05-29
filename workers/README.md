# Atelier Vélo+ — Workers Cloudflare

Code serveur déployé en edge sur Cloudflare Workers. Tient toute la partie qui ne peut pas vivre dans une app Electron locale :

- `POST /billing/checkout` — démarre une session Stripe Checkout
- `GET  /billing/order-status?session_id=…` — statut polling post-paiement
- `POST /billing/webhook` — webhook signé Stripe → enregistre la commande, génère un `PurchaseToken`, envoie l'email d'activation
- `POST /license/redeem` — échange `{ token, hardwareId }` contre une vraie clé licence signée RSA

Persistance : Cloudflare D1 (SQLite serverless).

---

## Premier déploiement

### 1. Pré-requis
- Compte Cloudflare actif
- `wrangler` CLI installé (`npm install -g wrangler`) puis `wrangler login`
- Le PEM de la clé privée RSA (le même que `license-generator/private-key.pem` côté local)
- Un compte Resend pour les emails (clé `RESEND_API_KEY`)
- Compte Stripe + 3 produits créés (utilise `node ../scripts/setup-stripe-products.mjs` depuis le repo racine)

### 2. Installer les deps + créer la D1
```bash
cd workers
npm install
wrangler d1 create atelier-velo-orders            # affiche un database_id
# colle ce database_id dans wrangler.toml ([[d1_databases]].database_id)

wrangler d1 create atelier-velo-orders-prod       # pour le live
# colle aussi dans [[env.production.d1_databases]].database_id

# Applique le schéma
npm run db:migrate                                 # local
wrangler d1 migrations apply DB --env production --remote   # prod
```

### 3. Définir les secrets

Mode **test** (default) :
```bash
wrangler secret put STRIPE_SECRET_KEY            # sk_test_…
wrangler secret put STRIPE_WEBHOOK_SECRET        # whsec_… (créé à l'étape 5)
wrangler secret put STRIPE_PRICE_BASIQUE         # price_…
wrangler secret put STRIPE_PRICE_PRO             # price_…
wrangler secret put STRIPE_PRICE_PRO_LIFETIME    # price_…
wrangler secret put LICENSE_PRIVATE_KEY_PEM      # colle le PEM (\n autorisés)
wrangler secret put RESEND_API_KEY               # re_…
wrangler secret put EMAIL_FROM                   # onboarding@…
wrangler secret put APP_PUBLIC_URL               # https://tarifs.tondomaine.fr
```

Pour **production** : ajoute `--env production` à chaque commande, et utilise les valeurs LIVE.

### 4. Déployer
```bash
npm run deploy            # test
npm run deploy:prod       # production
```

Le déploiement affiche une URL `https://atelier-velo-api.<sous-domaine>.workers.dev`. Tu peux mapper un custom domain via le dashboard.

### 5. Configurer le webhook Stripe
Dashboard Stripe → Developers → Webhooks → Add endpoint :
- URL : `https://<URL_DU_WORKER>/billing/webhook`
- Events : `checkout.session.completed`, `payment_intent.payment_failed`
- Stripe affiche un `whsec_…` — repasse-le en secret (étape 3) puis redéploie.

### 6. Front statique
La page `/tarifs` peut être hébergée :
- En Cloudflare Pages (recommandé, gratuit)
- Sur n'importe quel CDN statique

Elle pointe vers `https://<URL_DU_WORKER>/billing/checkout`.

---

## Développement local

```bash
npm run dev               # wrangler dev sur http://localhost:8787
```

Pour tester un webhook localement :
```bash
stripe listen --forward-to localhost:8787/billing/webhook
# Récupère le whsec_… affiché et exporte-le en variable d'env
```

---

## Sécurité

- La clé privée RSA n'existe **que** dans les secrets Workers de Cloudflare. Jamais dans le repo, jamais dans l'app cliente.
- Les apps Electron ne contiennent que la clé publique pour vérifier les licences.
- Le webhook vérifie la signature Stripe avant tout effet de bord.
- La D1 est privée à ton compte Cloudflare.
