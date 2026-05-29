# Sprint 2 — Rapport (commercialisation)

Branche : `refonte-2026`. Tag : `sprint-2-done`.

## Ce qui a été livré

### S2.A — Infrastructure Stripe
- SDK `stripe@22` installé.
- Modèles Prisma : `Order`, `StripeConnection`, `PurchaseToken`.
- Lib `src/lib/stripe.ts` : client singleton, helpers `getStripeMode()`/`getPriceIdForTier()`/`getWebhookSecret()`/`getConnectClientId()`. Mode test/live via env `STRIPE_MODE`.
- Page publique `/tarifs` (3 cards Basique 199€ / Pro 359€ / Pro Lifetime 599€ + bouton Checkout).
- Pages `/tarifs/success` (statut commande) et placeholder `/tarifs?cancelled=1`.
- Routes API `/api/billing/checkout`, `/api/billing/webhook`, `/api/billing/order-status` (publiques).

### S2.B — Vente éditeur (Stripe Checkout + token d'activation)
- Webhook signé Stripe (`stripe.webhooks.constructEvent`).
- À l'événement `checkout.session.completed` : `Order` marqué `paid`, génération d'un `PurchaseToken` 24 hex char (24 par défaut), email d'activation envoyé via `mailer.ts`.
- Endpoint `POST /api/license/redeem` : valide le token + hardware ID local, génère une clé via `src/lib/license-generator-server.ts` (refactor de `license-generator/generate-license.js`), retourne la clé. Idempotent : re-essai sur la même machine renvoie la même clé.
- Composant `RedeemPurchaseTokenCard` ajouté en haut de `/admin/license` : récupère le hardware ID local, soumet le code, affiche la clé pour copie/activation.
- 6 tests unitaires sur `generateLicense`.

### S2.C — Stripe Connect OAuth (atelier connecte SON Stripe)
- `POST /api/integrations/stripe/connect` : génère un state CSRF stocké en cookie httpOnly, renvoie l'URL d'autorisation Stripe.
- `GET /api/integrations/stripe/callback` : vérifie le state, échange le code via `stripe.oauth.token`, persiste `StripeConnection`. Redirige sur la page admin avec `connected=1`.
- Page admin `/admin/integrations/stripe` : statut, mode (test/live), bouton Connecter / Déconnecter.

### S2.D — Export FEC comptable
- Lib `src/lib/fec-export.ts` : format normé art. A47 A-1 LPF, 18 colonnes pipe-séparées, en-tête CRLF, dates `YYYYMMDD`, montants en virgule décimale.
- Mapping métier : 411 (client), 706 (vente HT), 445710 (TVA collectée). Inversion pour les avoirs. Exclusion des brouillons.
- Route `GET /api/exports/fec?from=&to=` (téléchargement texte).
- Page admin `/admin/exports` (sélecteur de période + bouton).
- 5 tests unitaires.

### S2.E — Sauvegarde SQLite automatique
- Lib `src/lib/backup-service.ts` : `createBackup()` via `VACUUM INTO` + gzip + horodatage, `listBackups()`, `restoreBackup()` (avec sauvegarde de précaution avant écrasement et garde anti-path traversal).
- Cron quotidien à 3h Europe/Paris ajouté à `scheduler.ts`.
- API `/api/admin/backups` (GET liste, POST création), `/api/admin/backups/restore` (POST restore).
- Page admin `/admin/backups` (création manuelle, liste, restore 1-clic).
- Rotation : 30 derniers fichiers conservés.
- 5 tests unitaires.

### S2.F — Sentry opt-in
- `src/lib/sentry.ts` : init conditionnel (no-op si `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` absent).
- Configs `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`.
- `sendDefaultPii: false` (RGPD). Activation forcée via `SENTRY_FORCE=1` en dev.

### S2.G — Auto-update Electron (Cloudflare R2)
- `electron-builder.config.yml` : publish provider passé de `github` à `generic` avec `url: ${env.AUTO_UPDATE_FEED_URL}`.
- `electron/auto-updater.js` : réactivation conditionnelle (active si `AUTO_UPDATE_FEED_URL` défini, sinon log + skip propre).
- Script `scripts/publish-update-r2.mjs` : upload des artefacts (`latest.yml`, `.zip`, `.exe`, `.blockmap`) sur R2 via `@aws-sdk/client-s3`.

### Scripts et doc
- `scripts/setup-stripe-products.mjs` : crée les 3 produits + prix sur Stripe (test ou live) en idempotent (cherche par metadata `atelierVelo`).
- `scripts/publish-update-r2.mjs` : publie une release R2.
- `docs/SPRINT-2-CREDENTIALS.md` : checklist pas-à-pas pour brancher Stripe / Connect / Sentry / R2 / clé RSA serveur.
- `.env.example` complété avec tous les nouveaux paramètres.

## Tests & lint
- **520 tests verts** (+16 nouveaux sprint 2 : FEC 5, backup 5, license-gen 6).
- ESLint `--max-warnings=0` vert.
- TypeScript clean (`tsc --noEmit` exit 0).

## Ce qui reste à brancher côté toi

Code prêt à recevoir les valeurs dans `.env`. Voir [docs/SPRINT-2-CREDENTIALS.md](SPRINT-2-CREDENTIALS.md) pour la procédure pas-à-pas. Récap rapide :

| Module | Action | Variables `.env` |
|---|---|---|
| Stripe Checkout | API keys + 3 produits (via script) + webhook endpoint | `STRIPE_SECRET_KEY_TEST`/`_LIVE`, `STRIPE_PUBLISHABLE_KEY_TEST`/`_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`/`_LIVE`, `STRIPE_PRICE_*` |
| Stripe Connect | Activer Platform (review Stripe ~quelques jours) | `STRIPE_CONNECT_CLIENT_ID_TEST`/`_LIVE` |
| Sentry | Créer compte + project Next.js | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |
| Auto-update R2 | Créer bucket + API token Cloudflare | `AUTO_UPDATE_FEED_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` |
| Signature licence serveur | Pointer vers `private-key.pem` hors-repo | `LICENSE_PRIVATE_KEY_PATH` ou `LICENSE_PRIVATE_KEY_PEM` |
| URL publique | URL où l'app est hébergée | `NEXT_PUBLIC_APP_URL` |

## Commits du sprint
```
40a05a9b1 [s2] feat(infra): Sentry + R2 auto-update + Stripe setup script + publish script + docs
041f9bdf1 [s2] feat(license): activation token flow (webhook → token → email → redeem → key)
134730a59 [s2] feat(backup): automatic SQLite backup + restore + tests
0d2623230 [s2] feat(accounting): FEC export
a77b74731 [s2] feat(stripe): infrastructure
```

## Retour arrière
```bash
git reset --hard sprint-2-done   # tag stable Sprint 2
git reset --hard sprint-1-done   # avant Sprint 2
git reset --hard sprint-0-done   # avant Sprint 1
git checkout windows             # avant toute refonte
```

## Sprint 3 envisagé (à planifier après vente confirmée)

- Migration Next.js 13 → 15
- Certificat EV Windows + signature `.exe` + remontée NSIS
- TypeScript strict complet (161 + 246 erreurs préexistantes à traiter)
- SQLite chiffré (SQLCipher) pour PII
- Refresh tokens JWT + révocation
- macOS DMG signé + notarisé
- Marketing : SEO, partenariats fédération, démos vidéo
