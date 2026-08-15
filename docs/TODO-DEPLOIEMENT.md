# Atelier Vélo+ — Tâches à réaliser pour mise en service

> **Comment utiliser ce doc** : suis les phases dans l'ordre. Chaque tâche a un titre, un objectif, des étapes numérotées et un test de validation. Les blocs `bash` se copient/collent dans un terminal PowerShell ou Git Bash dans `C:\atelier\`.

---

## Phase 0 — Validation locale (à faire MAINTENANT, 30 min)

### Tâche 0.1 — Tester l'app actuelle en mode dev
**Objectif** : vérifier que toutes les modifications Sprint 2 et 3 marchent en runtime.

1. Dans `C:\atelier\` :
   ```bash
   npm run dev
   ```
2. Attends "✓ Ready" puis ouvre `http://localhost:3000` dans ton navigateur.
3. Connecte-toi avec ton compte existant.
4. Teste les nouvelles pages :
   - `http://localhost:3000/admin/exports` → la page FEC s'affiche, sélecteur de date OK
   - `http://localhost:3000/admin/backups` → liste vide (normal), bouton "Sauvegarder maintenant" → cliquer → un fichier `.db.gz` apparaît dans la liste
   - `http://localhost:3000/admin/integrations/stripe` → formulaire saisie clés
   - `http://localhost:3000/admin/license` → carte "Activer un code d'achat" en haut (avec un message d'erreur attendu sur le bouton tant que le Worker n'est pas déployé)
5. Vérifie qu'aucune fonctionnalité existante n'a régressé (clients, tickets, factures, calendrier, paramètres).
6. Stop dev avec Ctrl+C.

**Test de validation** : tu vois les 4 nouvelles pages et l'app marche normalement.

---

### Tâche 0.2 — Rebuild de l'app Electron
**Objectif** : produire un installateur ZIP Windows à jour.

1. Dans `C:\atelier\` :
   ```bash
   npm run build:electron
   ```
2. Attendre 5 à 15 minutes (Next.js build + electron-builder + afterPack).
3. Quand terminé, vérifier dans `dist-electron\` :
   - `Atelier Velo+-1.1.0-win-x64.zip` (~100 Mo)
   - `latest.yml` (pour auto-update)
   - dossier `win-unpacked\` (l'app décompressée, exécutable directement)

**Test de validation** : `dist-electron\win-unpacked\Atelier Velo+.exe` se lance et tu peux te connecter.

---

## Phase 1 — Sécurité résiduelle Sprint 0 (10 min)

### Tâche 1.1 — Révoquer l'ancienne clé Resend (CRITIQUE)
**Objectif** : l'ancienne clé Resend (préfixe `re_JKg…`) était en clair dans `.env`, donc compromise.
Il faut la tuer côté Resend. *(Fait — clé révoquée pendant le Sprint 0. Valeur retirée de ce
document : ne jamais recopier un secret dans la doc, même pour expliquer comment le supprimer.)*

1. Connecte-toi sur https://resend.com/api-keys
2. Repère l'ancienne clé (préfixe `re_JKg…`).
3. Clique sur les trois points → **Revoke**.
4. Clique **Create API Key**, nomme-la "atelier-velo-prod", copie la nouvelle valeur.
5. Colle dans `C:\atelier\.env` à la ligne :
   ```
   RESEND_API_KEY=re_LA_NOUVELLE_CLE
   ```
6. Si l'ancienne valeur apparaît aussi dans `.env.production`, remplace-la pareil.

**Test de validation** : aucune trace de l'ancienne clé (`re_JKg…`) dans tes fichiers `.env*`.

---

### Tâche 1.2 — Révoquer le mot de passe d'application Gmail
**Objectif** : `bjqjafiznniczrheh` est compromis (était en clair dans `.env.local`).

1. Connecte-toi sur https://myaccount.google.com/apppasswords avec le compte `jeromeley.apps@gmail.com`.
2. Repère le mot de passe d'application "Atelier Vélo+" (ou similaire) → **Supprimer**.
3. Génère-en un nouveau, copie les 16 caractères.
4. Colle dans `C:\atelier\.env.local` :
   ```
   SMTP_PASS=NOUVEAU_MDP_16CAR
   ```

**Test de validation** : un envoi d'email test depuis l'app fonctionne (Paramètres → Test email SMTP, ou via une facture).

---

## Phase 2 — Stripe (compte + produits + clés atelier) (45 min)

### Tâche 2.1 — Activation du compte Stripe et création d'une Restricted Key pour TON atelier
**Objectif** : l'atelier de test (toi) doit pouvoir encaisser via Stripe depuis l'app.

1. Connecte-toi sur https://dashboard.stripe.com/
2. Active le mode **Test** (toggle en haut à droite : "View test data").
3. Va sur **Developers → API keys** : https://dashboard.stripe.com/test/apikeys
4. Note ta `Publishable key` test (`pk_test_...`).
5. Plus bas, clique **+ Create restricted key**.
6. Nomme-la "Atelier Vélo+ - encaissement", coche les permissions :
   - **Charges** : Write
   - **Customers** : Write
   - **Payment Intents** : Write
   - **Setup Intents** : Write (si tu veux du SCA)
   - **Products** : Read (pour lister tes produits depuis l'app, optionnel)
7. Clique **Create key**, copie la valeur `rk_test_...`.

**Test de validation** : tu as deux valeurs notées : `pk_test_…` et `rk_test_…`.

---

### Tâche 2.2 — Saisir tes clés dans Atelier Vélo+
**Objectif** : valider que la nouvelle page Stripe in-app fonctionne.

1. Lance l'app (dev ou ZIP buildé).
2. Va sur **Paramètres → Connexion Stripe** (`/admin/integrations/stripe`).
3. Colle ta `pk_test_…` dans "Clé publique".
4. Colle ta `rk_test_…` dans "Clé secrète".
5. Donne un libellé optionnel ("Atelier test").
6. Clique **Valider et enregistrer**.

**Test de validation** : alerte verte "Clés enregistrées et validées par Stripe." Le bloc "Compte configuré" apparaît avec le statut Actif + chip "Test".

---

### Tâche 2.3 — Créer les 3 produits Stripe pour la vente éditeur (avec script)
**Objectif** : créer Basique 199€, Pro 359€, Pro Lifetime 599€ dans ton compte Stripe.

> Important : ces produits sont pour **TOI vendeur** (vente des licences Atelier Vélo+), pas pour les encaissements des ateliers.

1. Récupère ta `Secret Key` test (différente de la restricted key !) : https://dashboard.stripe.com/test/apikeys → **Reveal test key** dans la section "Secret key", copie `sk_test_...`.
2. Dans `C:\atelier\` :
   ```bash
   $env:STRIPE_SECRET_KEY="sk_test_TA_CLE_ICI"
   node scripts/setup-stripe-products.mjs
   ```
3. Le script affiche 3 lignes :
   ```
   STRIPE_PRICE_BASIQUE_TEST=price_xxx
   STRIPE_PRICE_PRO_TEST=price_xxx
   STRIPE_PRICE_PRO_LIFETIME_TEST=price_xxx
   ```
4. **Copie-les quelque part** (Bloc-notes), tu en auras besoin Phase 3.

**Test de validation** : sur https://dashboard.stripe.com/test/products, tu vois 3 produits "Atelier Vélo+ Basique/Pro/Pro Lifetime".

---

## Phase 3 — Cloudflare Workers (vente éditeur côté serveur) (60 min)

### Tâche 3.1 — Compte Cloudflare + Wrangler CLI
**Objectif** : prêt à déployer.

1. Si tu n'as pas de compte : https://dash.cloudflare.com/sign-up (gratuit).
2. Installe wrangler globalement :
   ```bash
   npm install -g wrangler
   ```
3. Connecte-toi :
   ```bash
   wrangler login
   ```
   Ça ouvre une fenêtre navigateur, autorise.

**Test de validation** : `wrangler whoami` affiche ton email.

---

### Tâche 3.2 — Installer les deps du projet Workers
1. ```bash
   cd C:\atelier\workers
   npm install
   ```

**Test de validation** : pas d'erreur, `node_modules/` créé.

---

### Tâche 3.3 — Créer les bases D1 (SQLite serverless)
1. Toujours dans `C:\atelier\workers\` :
   ```bash
   wrangler d1 create atelier-velo-orders
   ```
2. Le terminal affiche quelque chose comme :
   ```
   ✅ Created database 'atelier-velo-orders'
   [[d1_databases]]
   binding = "DB"
   database_name = "atelier-velo-orders"
   database_id = "a1b2c3d4-..."
   ```
3. **Copie le `database_id`** et colle-le dans `C:\atelier\workers\wrangler.toml` ligne 11 :
   ```toml
   database_id = "a1b2c3d4-..."
   ```
4. Crée aussi la base prod :
   ```bash
   wrangler d1 create atelier-velo-orders-prod
   ```
5. Colle le nouveau `database_id` dans la section `[[env.production.d1_databases]]` du même `wrangler.toml`.

**Test de validation** : `wrangler.toml` contient 2 `database_id` réels (pas "REMPLACER...").

---

### Tâche 3.4 — Appliquer le schéma D1
1. ```bash
   npm run db:migrate
   ```
2. Output : "Migrations to be applied → 0001_init.sql → ✓".

**Test de validation** : 
```bash
wrangler d1 execute atelier-velo-orders --command "SELECT name FROM sqlite_master WHERE type='table'" --local
```
Doit lister `orders` et `purchase_tokens`.

---

### Tâche 3.5 — Définir les secrets Workers (mode test)
> Chaque commande demande la valeur en interactif (collage masqué).

1. **Clé secrète Stripe** :
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   ```
   Colle ta `sk_test_…` quand demandé.
2. **Webhook secret** (provisoire, on le remplacera à la tâche 3.7) :
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
   Tape `whsec_placeholder` pour l'instant.
3. **Prix Stripe** (les 3 valeurs de la Tâche 2.3) :
   ```bash
   wrangler secret put STRIPE_PRICE_BASIQUE
   wrangler secret put STRIPE_PRICE_PRO
   wrangler secret put STRIPE_PRICE_PRO_LIFETIME
   ```
4. **Clé privée RSA** :
   ```bash
   wrangler secret put LICENSE_PRIVATE_KEY_PEM
   ```
   Ouvre `C:\atelier\license-generator\private-key.pem` dans un éditeur texte, **copie tout le contenu** (de `-----BEGIN` à `-----END` inclus), colle dans le terminal.
5. **Resend** :
   ```bash
   wrangler secret put RESEND_API_KEY
   ```
   Colle ta nouvelle clé (Tâche 1.1).
6. **Email expéditeur** :
   ```bash
   wrangler secret put EMAIL_FROM
   ```
   Tape `onboarding@resend.dev` (ou ton domaine si vérifié sur Resend).
7. **URL publique des tarifs** :
   ```bash
   wrangler secret put APP_PUBLIC_URL
   ```
   Tape `https://atelier-velo-tarifs.pages.dev` pour l'instant (on l'ajustera Phase 4).

**Test de validation** :
```bash
wrangler secret list
```
Doit lister les 8 secrets.

---

### Tâche 3.6 — Premier déploiement
1. ```bash
   npm run deploy
   ```
2. À la fin, tu vois une URL du type `https://atelier-velo-api.XXX.workers.dev`.
3. **Note cette URL** — c'est ton "ATELIER_API_BASE".

**Test de validation** :
```bash
curl https://atelier-velo-api.XXX.workers.dev/billing/order-status?session_id=test
```
Doit répondre `{"status":"unknown"}` (404 attendu, ça prouve que le worker répond).

---

### Tâche 3.7 — Configurer le webhook Stripe
**Objectif** : Stripe doit notifier le Worker à chaque paiement.

1. Va sur https://dashboard.stripe.com/test/webhooks
2. Clique **+ Add endpoint**.
3. **Endpoint URL** : colle `https://atelier-velo-api.XXX.workers.dev/billing/webhook`
4. **Events to send** : clique **Select events** → coche :
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Clique **Add endpoint**.
6. Sur la page de l'endpoint qui s'ouvre, clique **Reveal** sous "Signing secret", copie la valeur `whsec_…`.
7. Mets-la à jour dans le Worker :
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
   Colle le `whsec_…` réel.
8. Re-déploie :
   ```bash
   npm run deploy
   ```

**Test de validation** : sur la page du webhook Stripe, clique **Send test event** → choisis `checkout.session.completed` → **Send**. Tu dois voir une réponse `200` "received: true".

---

## Phase 4 — Cloudflare Pages (page /tarifs publique) (20 min)

### Tâche 4.1 — Déployer pages-tarifs sur Cloudflare Pages
1. Va sur https://dash.cloudflare.com/?to=/:account/pages
2. Clique **Create application → Upload assets**.
3. Donne un nom de projet : `atelier-velo-tarifs`.
4. Glisse-dépose le dossier `C:\atelier\pages-tarifs\` (tout son contenu, pas le dossier lui-même).
5. Clique **Deploy site**.
6. Cloudflare te donne une URL : `https://atelier-velo-tarifs.pages.dev`.

**Test de validation** : ouvre l'URL, tu vois la page tarifs avec les 3 cards.

---

### Tâche 4.2 — Pointer la page vers ton Worker
1. Ouvre `C:\atelier\pages-tarifs\index.html` dans un éditeur.
2. Trouve la ligne :
   ```js
   const API_BASE = (window.ATELIER_API_BASE || 'https://atelier-velo-api.YOUR-SUBDOMAIN.workers.dev').replace(/\/$/, '');
   ```
3. Remplace `YOUR-SUBDOMAIN` par le sous-domaine réel de ton worker (vu Tâche 3.6).
4. Fais pareil dans `success.html`.
5. Re-upload sur Cloudflare Pages (drag & drop pareil) OU connecte Pages à Git pour redéploiement auto.

**Test de validation** : sur `https://atelier-velo-tarifs.pages.dev`, saisis un email, clique "Choisir Pro" → tu es redirigé sur une page Stripe Checkout (en mode test).

---

### Tâche 4.3 — Mettre à jour l'URL publique côté Worker
1. Maintenant que tu as ton URL Pages :
   ```bash
   cd C:\atelier\workers
   wrangler secret put APP_PUBLIC_URL
   ```
   Tape `https://atelier-velo-tarifs.pages.dev`.
2. Re-déploie :
   ```bash
   npm run deploy
   ```

**Test de validation** : un email envoyé après un test de paiement contient le bon lien d'activation.

---

## Phase 5 — Test E2E : achat factice → activation (30 min)

### Tâche 5.1 — Test paiement complet en mode Stripe Test
1. Sur ta page tarifs, saisis ton email (vrai email pour recevoir le mail), clique **Choisir Pro**.
2. Sur la page Stripe Checkout, utilise la carte de test :
   - Numéro : `4242 4242 4242 4242`
   - Expiration : n'importe quoi dans le futur (ex `12/30`)
   - CVC : n'importe quoi (ex `123`)
3. Clique **Pay €359**.
4. Tu es redirigé sur `https://atelier-velo-tarifs.pages.dev/success.html?session_id=…`
5. Au bout de quelques secondes, tu vois "Merci, paiement confirmé".
6. Ouvre ta boîte mail → tu reçois un email "Ton code d'activation Atelier Vélo+ Pro" avec un code 24-caractères.

**Test de validation** : email reçu avec un code.

---

### Tâche 5.2 — Configurer l'app Electron pour pointer vers le Worker
1. Édite `C:\atelier\.env.production` (créé-le s'il n'existe pas avec le contenu existant) :
   ```
   NEXT_PUBLIC_ATELIER_API_BASE=https://atelier-velo-api.XXX.workers.dev
   ```
2. Rebuild l'app :
   ```bash
   npm run build:electron
   ```
3. Décompresse `dist-electron\Atelier Velo+-1.1.0-win-x64.zip` quelque part.

**Test de validation** : le ZIP contient bien l'URL Worker dans son `.env.production` embarqué.

---

### Tâche 5.3 — Activer le code d'achat dans l'app
1. Lance `Atelier Velo+.exe`.
2. Connecte-toi (ou crée un compte si nouveau install).
3. Va sur **Paramètres → Licence**.
4. Sur la carte **Activer un code d'achat**, colle le code reçu par email.
5. Clique **Activer**.
6. Tu vois la clé de licence générée. Copie-la dans le champ "Activer une licence" plus bas et active.

**Test de validation** : la licence est active, l'app affiche "Pro" dans Paramètres → Licence.

---

## Phase 6 — Sentry (télémétrie, optionnel) (15 min)

### Tâche 6.1 — Créer un compte Sentry
1. https://sentry.io/signup/ — plan gratuit (5000 events/mois).
2. Crée une **organization** + **project** :
   - Platform : **Next.js**
3. Sentry te donne un DSN du type `https://abc@oXXXX.ingest.sentry.io/YYYY`.

---

### Tâche 6.2 — Configurer le DSN
1. Édite `C:\atelier\.env.production` :
   ```
   SENTRY_DSN=https://abc@oXXXX.ingest.sentry.io/YYYY
   NEXT_PUBLIC_SENTRY_DSN=https://abc@oXXXX.ingest.sentry.io/YYYY
   NEXT_PUBLIC_APP_VERSION=1.1.0
   ```
2. Rebuild Electron.

**Test de validation** : provoque une erreur (ex: clique sur un bouton dans une page admin et fais une action qui plante). Va sur sentry.io → ton projet → tu vois l'erreur remontée.

---

## Phase 7 — Cloudflare R2 (auto-update, optionnel pour le moment) (30 min)

> Recommandation : fais ça quand tu seras prêt à distribuer une v1.2.0 ou v2.0.0. Pas urgent.

### Tâche 7.1 — Créer un bucket R2
1. https://dash.cloudflare.com/?to=/:account/r2
2. **Create bucket** → nom : `atelier-velo-updates` → **Create**.
3. Sur la page du bucket : **Settings → Public access → Allow public access** → Allow.
4. Note l'URL "Public R2.dev Bucket URL" qui s'affiche (`https://pub-XXX.r2.dev`).

---

### Tâche 7.2 — Créer un API token R2
1. https://dash.cloudflare.com/?to=/:account/r2/api-tokens
2. **Create API token** :
   - Permissions : **Object Read & Write**
   - Bucket : `atelier-velo-updates`
3. Note **Access Key ID**, **Secret Access Key**, **Account ID** (visible dans l'URL : `dash.cloudflare.com/<account-id>/r2`).

---

### Tâche 7.3 — Configurer .env.production
```
AUTO_UPDATE_FEED_URL=https://pub-XXX.r2.dev/
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=atelier-velo-updates
R2_PUBLIC_BASE_URL=https://pub-XXX.r2.dev/
```

---

### Tâche 7.4 — Publier la première version
```bash
npm run build:electron
node scripts/publish-update-r2.mjs
```
Le script upload `latest.yml`, le `.zip` et `.exe`.

**Test de validation** : `curl https://pub-XXX.r2.dev/latest.yml` retourne le contenu du YAML.

---

## Phase 8 — Passage en LIVE Stripe (quand tu vends pour de vrai)

> À faire **APRÈS** avoir validé tout le flow en mode test.

### Tâche 8.1 — Activer le mode Live sur Stripe
1. Dashboard Stripe → **Activate account** → remplir formulaire entreprise + RIB.
2. Validation Stripe sous 24-48h.

---

### Tâche 8.2 — Recréer les produits en mode Live
1. Toggle Stripe en mode **Live** (en haut à droite).
2. ```bash
   $env:STRIPE_SECRET_KEY="sk_live_TA_CLE_LIVE"
   node scripts/setup-stripe-products.mjs
   ```
3. Note les 3 nouveaux `STRIPE_PRICE_*_LIVE`.

---

### Tâche 8.3 — Déployer le Worker en mode production
1. ```bash
   cd C:\atelier\workers
   wrangler d1 migrations apply DB --env production --remote
   wrangler secret put STRIPE_SECRET_KEY --env production
   wrangler secret put STRIPE_WEBHOOK_SECRET --env production
   wrangler secret put STRIPE_PRICE_BASIQUE --env production
   wrangler secret put STRIPE_PRICE_PRO --env production
   wrangler secret put STRIPE_PRICE_PRO_LIFETIME --env production
   wrangler secret put LICENSE_PRIVATE_KEY_PEM --env production
   wrangler secret put RESEND_API_KEY --env production
   wrangler secret put EMAIL_FROM --env production
   wrangler secret put APP_PUBLIC_URL --env production
   npm run deploy:prod
   ```
2. Note la nouvelle URL prod du Worker.
3. Configure le webhook Stripe (mode live) vers cette URL prod (Tâche 3.7 répétée en live).

---

### Tâche 8.4 — Update app Electron pour pointer vers le Worker prod
1. `.env.production` :
   ```
   NEXT_PUBLIC_ATELIER_API_BASE=https://atelier-velo-api-prod.XXX.workers.dev
   ```
2. Rebuild + republier sur R2.

---

## Phase 9 — Distribution & marketing (sprint futur)

### Tâche 9.1 — Domaine personnalisé pour la page tarifs
1. Cloudflare Pages → ton projet → **Custom domains → Set up a custom domain**.
2. Tape `tarifs.tondomaine.fr`, suis les instructions DNS.

---

### Tâche 9.2 — Signature EV Windows (~150 €/an)
> Élimine le warning "Éditeur inconnu" Windows et accélère l'acceptation Defender.

1. Achète un certificat EV chez Sectigo, SSL.com, ou DigiCert.
2. Configure `electron-builder.config.yml` :
   ```yaml
   win:
     forceCodeSigning: true
     certificateSubjectName: "Ton Nom Légal"
   ```
3. Rebuild.

---

### Tâche 9.3 — Marketing (planification)
- Page de présentation : tarifs.tondomaine.fr (fait Phase 4) + page d'accueil avec démos vidéo
- SEO : mots-clés "logiciel atelier vélo", "gestion réparation vélo"
- Partenariats : Fédération française des Usagers de la Bicyclette, Cyclofficine, réseaux d'ateliers solidaires
- Démos YouTube : tour complet de l'app en 5 min, focus modules différenciants (FEC, paiement Stripe in-app, sauvegarde 1-clic)
- Communauté : groupe Facebook réparateurs vélo + Discord/Telegram pour support utilisateur

---

## Récap : ordre de priorité

| # | Phase | Quand | Durée | Pré-requis |
|---|---|---|---|---|
| 0 | Validation locale | Maintenant | 30 min | Aucun |
| 1 | Révocation secrets | Aujourd'hui | 10 min | Phase 0 OK |
| 2 | Stripe compte + clés | Cette semaine | 45 min | Phase 1 OK |
| 3 | Workers Cloudflare | Cette semaine | 60 min | Phase 2 OK |
| 4 | Pages /tarifs | Cette semaine | 20 min | Phase 3 OK |
| 5 | Test E2E achat | Cette semaine | 30 min | Phases 3+4 OK |
| 6 | Sentry | Optionnel | 15 min | Aucun |
| 7 | R2 auto-update | Quand v1.2 prête | 30 min | Aucun |
| 8 | Live Stripe | Quand prêt à vendre | 30 min | Phase 5 validée |
| 9 | Marketing | Sprint dédié | — | Phase 8 OK |

**Total avant première vente possible (Phase 8) : ~3h30 de tâches concrètes**.

---

## En cas de blocage

- **Build Electron échoue** : voir `docs/SPRINT-1-RAPPORT.md` section S1.8.
- **`wrangler d1 create` échoue** : vérifier `wrangler whoami`, sinon relancer `wrangler login`.
- **Webhook Stripe retourne 400** : vérifier que `STRIPE_WEBHOOK_SECRET` côté Worker correspond bien au `whsec_…` affiché sur le dashboard.
- **Email d'activation pas reçu** : vérifier les logs Worker (`wrangler tail` dans `workers/`), vérifier `RESEND_API_KEY` valide.
- **`/admin/integrations/stripe` refuse les clés** : Stripe rejette parfois les keys en mode test si le compte n'est pas encore activé.

**Pour toute question** : reviens vers moi avec le message d'erreur et la tâche en cours.
