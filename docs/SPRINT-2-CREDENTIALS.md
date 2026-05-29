# Sprint 2 — Configuration des credentials

Tout le code Sprint 2 est en place. Pour activer chaque module, colle les valeurs ci-dessous dans ton `.env` (ou `.env.production` selon le mode).

---

## 1. Stripe — vente éditeur (Checkout + webhook)

### a) Récupère tes clés API
Dashboard Stripe → **Developers → API keys**. Tu as :
- `pk_test_…` / `sk_test_…` (mode test)
- `pk_live_…` / `sk_live_…` (mode live, après activation du compte)

À coller dans `.env` :
```
STRIPE_MODE=test
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_…
STRIPE_SECRET_KEY_TEST=sk_test_…
STRIPE_PUBLISHABLE_KEY_LIVE=
STRIPE_SECRET_KEY_LIVE=
```

### b) Crée les 3 produits + prix (automatique)
```bash
STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.mjs
```
Le script affiche 3 lignes à coller dans `.env` :
```
STRIPE_PRICE_BASIQUE_TEST=price_…
STRIPE_PRICE_PRO_TEST=price_…
STRIPE_PRICE_PRO_LIFETIME_TEST=price_…
```
Recommence avec `sk_live_xxx` quand tu veux produire les prix LIVE.

### c) Configure le webhook Stripe
Dashboard → **Developers → Webhooks → Add endpoint** :
- **Endpoint URL** : `https://TON_URL_PUBLIQUE/api/billing/webhook`
- **Events à écouter** : `checkout.session.completed`, `payment_intent.payment_failed`

Stripe affiche un `whsec_…` à coller :
```
STRIPE_WEBHOOK_SECRET_TEST=whsec_…
STRIPE_WEBHOOK_SECRET_LIVE=
```

> En dev local, utilise `stripe listen --forward-to localhost:3000/api/billing/webhook`. La commande affiche un `whsec_…` à utiliser comme `STRIPE_WEBHOOK_SECRET_TEST`.

---

## 2. Stripe Connect — encaissement atelier

### a) Activer Connect Platform
Dashboard → **Settings → Connect → Get started**.
Stripe demande à valider ta plateforme — quelques jours en review.
Une fois validée, **Connect → Settings → OAuth** :
- `client_id` test : `ca_…`
- `client_id` live : `ca_…`

À coller :
```
STRIPE_CONNECT_CLIENT_ID_TEST=ca_…
STRIPE_CONNECT_CLIENT_ID_LIVE=
```

### b) Configure le redirect URI
Même page, **OAuth redirects** : ajoute `https://TON_URL_PUBLIQUE/api/integrations/stripe/callback`.

### c) URL publique de l'app
```
NEXT_PUBLIC_APP_URL=https://TON_URL_PUBLIQUE
```

---

## 3. Sentry — télémétrie d'erreur

1. Créer un compte gratuit sur sentry.io.
2. Nouveau projet **Next.js**.
3. Sentry te donne 2 DSN (server + client) — souvent identiques. À coller :
```
SENTRY_DSN=https://xxx@oXXXXXX.ingest.sentry.io/XXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXXXXX.ingest.sentry.io/XXXXXX
NEXT_PUBLIC_APP_VERSION=1.1.0
```
4. (Optionnel) `SENTRY_FORCE=1` pour activer en dev local.

Sans DSN, le wrapper est un no-op total. Aucune télémétrie envoyée.

---

## 4. Auto-update Electron — Cloudflare R2

### a) Créer un bucket R2
Cloudflare dashboard → **R2 → Create bucket** → `atelier-velo-updates`.
**Settings → Public access → Allow public access** (active une URL `https://pub-XXX.r2.dev/`).

### b) Créer un API token
Cloudflare → **R2 → Manage R2 API tokens → Create API token** :
- Permissions : `Object Read & Write`
- Bucket : sélectionne ton bucket

Note `Access Key ID` + `Secret Access Key` + `Account ID` (dans l'URL du dashboard).

### c) Variables `.env.production`
```
AUTO_UPDATE_FEED_URL=https://pub-XXX.r2.dev/
R2_ACCOUNT_ID=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET=atelier-velo-updates
R2_PUBLIC_BASE_URL=https://pub-XXX.r2.dev/
```

### d) Publier une nouvelle version
```bash
# 1. Build
npm run build:electron

# 2. Upload sur R2 (utilise les 5 vars R2_*)
node scripts/publish-update-r2.mjs
```
Les apps installées en production interrogeront `${AUTO_UPDATE_FEED_URL}/latest.yml`
au démarrage et proposeront la mise à jour à l'utilisateur.

---

## 5. Clé privée RSA de signature des licences

Le webhook + l'endpoint `/api/license/redeem` doivent signer les licences avec la **clé privée RSA**.
Le fichier `license-generator/private-key.pem` existe déjà côté toi (ne le commit jamais).

En production (serveur web), 2 options :
```
LICENSE_PRIVATE_KEY_PATH=/opt/atelier/keys/private-key.pem
```
ou
```
LICENSE_PRIVATE_KEY_PEM=-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----
```

**À ne JAMAIS embarquer dans la dist Electron client** (Electron clients ne signent pas, ils vérifient avec la clé publique déjà incluse).

---

## Checklist de mise en production

- [ ] `STRIPE_*_LIVE` renseignés (clés + 3 prices + webhook)
- [ ] `STRIPE_CONNECT_CLIENT_ID_LIVE` (après validation Platform Stripe)
- [ ] `SENTRY_DSN` actif
- [ ] Bucket R2 créé + 5 `R2_*` + `AUTO_UPDATE_FEED_URL`
- [ ] `LICENSE_PRIVATE_KEY_PATH` pointé vers le PEM hors-repo
- [ ] `NEXT_PUBLIC_APP_URL` = URL publique réelle
- [ ] Test : achat factice en mode test → email reçu → activation token → clé délivrée
- [ ] Test : connexion atelier Stripe → callback OK → connexion visible dans `/admin/integrations/stripe`
