# Plan de refonte Atelier Vélo+ — 2026

Branche : `refonte-2026` (créée depuis `windows`).
Cadence : validation par sprint complet. Auto-commits aux étapes stratégiques. macOS exclu (différé après commercialisation Windows).

---

## Conventions

- **Tag git** à la fin de chaque sprint : `sprint-0-done`, `sprint-1-done`, etc. → retour arrière facile via `git checkout <tag>`.
- **Commits intermédiaires** préfixés : `[s0]`, `[s1]`… avec message explicite.
- **Doute = STOP** : on s'arrête et on demande. Pas d'action destructive non annoncée.
- **Avant chaque sprint** : `npm test` doit passer (baseline verte). Si rouge, on diagnostique avant tout.

---

## Sprint 0 — Sécurité d'urgence (1-2 j)

**Objectif :** colmater les fuites avant toute autre modif. Rotation des secrets, durcissement JWT, nettoyage `package.json`.

### S0.1 — Nettoyage `package.json` corrompu
- Champs `description` et `author` contiennent du mojibake accumulé (504 KB pour 168 lignes).
- Remplacer par valeurs propres.
- **Commit** : `[s0] fix(pkg): clean corrupted description and author fields`

### S0.2 — Rotation des secrets
Générer (64 octets hex chacun) :
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `NEXTAUTH_SECRET` (déjà 32 octets b64, à confirmer)

Mettre à jour `.env`, `.env.local`, `.env.production`.
**Action utilisateur requise** : révoquer manuellement côté Resend (`RESEND_API_KEY`) et côté Gmail (`SMTP_PASS`), puis me coller les nouvelles valeurs. Je ne touche pas aux services externes sans confirmation.

- **Commit** : `[s0] chore(env): rotate JWT_SECRET, ENCRYPTION_KEY (env files only, gitignored)` *(les .env sont gitignored, le commit ne contient que les guards code)*

### S0.3 — Durcir `src/lib/jwt.ts`
- Supprimer le fallback `dev-secret-CHANGE-IN-PRODUCTION-IMMEDIATELY` (forcer erreur même en dev si `JWT_SECRET` absent ou < 32 octets).
- Supprimer le fallback `x-user-id` / `x-user-role` (sécurité critique : permet de bypasser JWT). Le mode Electron local doit signer un vrai JWT au démarrage.
- Ajouter test unitaire de garde.
- **Commit** : `[s0] feat(auth): enforce JWT secret strength, remove header bypass`

### S0.4 — Audit Electron `BrowserWindow`
Vérifier dans `electron/index.js` et `electron/main.js` :
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` si compatible
- `webSecurity: true`
- Preload script présent et minimal
- CSP via `session.defaultSession.webRequest.onHeadersReceived` ou meta http-equiv

Si manquant : corriger. Si déjà bon : documenter dans `docs/SECURITE.md`.
- **Commit** : `[s0] feat(electron): harden BrowserWindow (CSP + sandbox)`

### S0.5 — Tag fin de sprint
```
git tag sprint-0-done -m "Sprint 0: sécurité d'urgence terminée"
```

**Livrable** : rapport `docs/SPRINT-0-RAPPORT.md` listant ce qui a été fait, ce qui reste côté utilisateur (rotation Resend/Gmail), et les éventuelles régressions détectées.

---

## Sprint 1 — Build, qualité, dette (2 semaines)

### S1.1 — Nettoyage code mort & commentaires
- Audit ciblé via Grep : repérer les blocs `// removed`, `// TODO supprimer`, `console.log` debug, code commenté volumineux.
- **Règle** : on supprime UNIQUEMENT si la suppression est triviale et l'app reste fonctionnelle (tests verts). Sinon on ouvre un ticket dans `docs/AUDIT-TODO-2025-12.md`.
- 589 `console.log` → script de migration vers `logger` (semi-auto, validation visuelle par lot).
- **Commits par lot** : `[s1] chore(cleanup): remove commented code in <module>`, etc.

### S1.2 — Réactiver TypeScript strict
- Passer `tsconfig.json` → `strict: true` une option à la fois (`noImplicitAny`, `strictNullChecks`…) pour gérer la dette progressivement.
- Réactiver `typescript.ignoreBuildErrors: false` dans `next.config.js` une fois le code propre.
- **Commit par option activée**.

### S1.3 — Bugs UX bloquants
- **Race AuthContext** (tickets page blanche 1er lancement) — `src/app/tickets/[id]/page.tsx`.
- **GlobalTextFieldEnhancer** — listeners focus dupliqués après relance.
- Tests Playwright reproduisant les 2 cas.
- **Commit** : `[s1] fix(ui): tickets first-load race, textfield listener duplication`

### S1.4 — Email facture avec PJ
- `src/lib/mailer.ts` : helper `sendWithAttachment(buffer, filename)`.
- `src/app/api/finance/invoices/[id]/email/route.ts` : générer PDF + envoi.
- Test E2E.
- **Commit** : `[s1] feat(invoices): attach PDF when emailing invoice`

### S1.5 — Cron licences anti-doublon
- Migration Prisma : `License.lastExpirationEmailSentAt DateTime?`.
- `cron-license-expiration.ts` : skip si déjà envoyé < 7j.
- Test unitaire.
- **Commit** : `[s1] feat(license): prevent duplicate expiration emails`

### S1.6 — ESLint qualité
- Règle `no-console` (warn) + `no-warning-comments` (warn `FIXME`).
- CI : `npm run lint:ci` doit rester vert (max-warnings progressif).
- **Commit** : `[s1] chore(eslint): enable no-console and no-warning-comments`

### S1.7 — CI Playwright
- Ajouter job Playwright dans `.github/workflows/ci.yml`.
- Cache navigateurs.
- **Commit** : `[s1] ci: add Playwright job`

### S1.8 — Build Electron : nettoyage des hacks
- Inventaire des hacks documentés (renommage `node_modules`, `afterPack` icône, `asarUnpack` trop large).
- Supprimer ou documenter chaque hack ; mesurer impact NSIS.
- Objectif : **réactiver NSIS** (cible 1) ou figer le fallback ZIP/SFX comme officiel (cible 2 si NSIS impossible).
- **Commit** : `[s1] build: clean electron-builder hacks, document remaining`

### S1.9 — Tag fin de sprint
```
git tag sprint-1-done -m "Sprint 1: build & qualité"
```

**Livrable** : rapport `docs/SPRINT-1-RAPPORT.md`.

---

## Sprint 2 — Commercialisation (3-4 semaines)

### S2.1 — Stripe Checkout
- Compte Stripe **actif** (confirmé utilisateur).
- Création produits Stripe : Basique 199€, Pro 359€, Pro Lifetime 599€ (mode test puis live).
- API route `src/app/api/billing/checkout/route.ts` : crée session Checkout, retourne URL.
- Webhook `src/app/api/billing/webhook/route.ts` : vérifie signature, déclenche génération de licence + envoi email automatique.
- Sécurité : `STRIPE_WEBHOOK_SECRET` en `.env.production`.
- **Pré-requis utilisateur** : me fournir clés Stripe test + créer les 3 produits (ou je le fais via API si tu me donnes les clés).
- **Commit** : `[s2] feat(billing): Stripe Checkout + webhook → auto license`

### S2.2 — Page tarifs publique
- Route Next.js `/tarifs` (publique, sans auth).
- 3 cards : Basique / Pro / Pro Lifetime + CTA "Acheter" → Checkout Stripe.
- Mention trial 14 jours et grace 7 jours (transparence vs lacune actuelle).
- Design Material UI cohérent avec l'app.
- **Commit** : `[s2] feat(public): pricing page`

### S2.3 — Génération de licence automatique
- Le webhook Stripe appelle `license-generator/generate-license.js` programmatiquement (extraire en module).
- Envoie email Resend avec clé.
- Stocke dans table Prisma `Order` (idempotence via `stripe_payment_intent_id`).
- **Commit** : `[s2] feat(license): auto-generate and email license after Stripe payment`

### S2.4 — Export FEC (différenciateur fort)
- Format FEC normé (art. A47 A-1 LPF).
- Route `src/app/api/exports/fec/route.ts` : période → CSV pipe-delimited.
- UI dans paramètres comptables.
- Test avec données mock conformes.
- **Commit** : `[s2] feat(accounting): FEC export`

### S2.5 — Sauvegarde SQLite automatique
- Service `src/services/backup.service.ts` : VACUUM INTO + compression gzip + horodatage.
- Cron quotidien (electron-cron ou node-cron côté main process).
- UI restore 1-clic dans paramètres.
- Rotation : garder 30 derniers backups.
- **Commit** : `[s2] feat(backup): automatic SQLite backup with 1-click restore`

### S2.6 — Sentry pour télémétrie prod
- Compte Sentry gratuit (free tier 5k events/mois).
- Wrapper `src/lib/sentry.ts` : init conditionnel (opt-in utilisateur, RGPD).
- Capture exceptions Next.js + Electron main.
- **Pré-requis utilisateur** : créer compte Sentry + me fournir DSN.
- **Commit** : `[s2] feat(monitoring): Sentry integration (opt-in)`

### S2.7 — Auto-update Electron
- **Pré-requis** : choisir hébergeur des releases. Options :
  - GitHub Releases (gratuit, repo public requis OU token PAT en prod)
  - Cloudflare R2 (gratuit jusqu'à 10 Go, S3-compatible)
  - OVH Object Storage
- `electron-updater` config dans `electron-builder.config.yml`.
- UI : notification "Mise à jour disponible" + bouton install.
- **Sans certificat EV** : auto-update reste fonctionnel mais Windows SmartScreen warnera. À documenter.
- **Question** : Cloudflare R2 recommandé (gratuit + rapide). À valider avant intégration.
- **Commit** : `[s2] feat(updater): auto-update via <provider>`

### S2.8 — Tag fin de sprint
```
git tag sprint-2-done -m "Sprint 2: commercialisation"
```

---

## Sprint 3 — Croissance (après vente confirmée)

À planifier après premiers retours utilisateurs payants. Items différés :
- Migration Next 13 → 15
- Certificat EV Windows
- SQLite chiffré (SQLCipher) pour PII
- Refresh tokens JWT + révocation
- Sync cloud optionnelle (Nextcloud/OneDrive)
- Licence multi-poste (upsell)
- Couverture tests 25%
- Marketing : SEO, partenariats, démos vidéo, communauté

**macOS exclu de ce plan** — sera traité quand le revenu Windows le justifie.

---

## Procédure de récupération

Si un commit casse l'app :
```bash
git log --oneline                    # repérer le commit problématique
git revert <sha>                     # annule sans réécrire l'historique
# ou retour complet au dernier tag stable :
git reset --hard sprint-0-done
```

Si une étape majeure casse :
```bash
git checkout sprint-0-done            # retour au dernier tag stable
```

Les `.env*` ne sont pas versionnés (gitignore) : conserver une sauvegarde locale avant chaque rotation.

---

## Suivi

Ce fichier est mis à jour à chaque fin de sprint. Voir aussi :
- `docs/SPRINT-0-RAPPORT.md`
- `docs/SPRINT-1-RAPPORT.md`
- `docs/SPRINT-2-RAPPORT.md`
