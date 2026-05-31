# État du projet Atelier Vélo+ — 1er juin 2026

> Rapport de fin de session. Sert de point de reprise. Branche de travail : `refonte-2026`.

---

## 1. Vue d'ensemble

Atelier Vélo+ est passé d'une application fonctionnelle mais non commercialisable à un
**produit vendable de bout en bout, en ligne, automatiquement**. Le tunnel découverte →
essai → achat → activation fonctionne sans aucune intervention manuelle.

**Statut global : commercialisable.** Quelques finitions optionnelles restent (signature de
code, redéploiement page, conformité fiscale sociétés).

---

## 2. Le tunnel de vente (opérationnel)

```
tarifs.upgradedbikes.com  (Cloudflare Pages, compte domaine 967b3a3e)
   │
   ├─ « Télécharger — essai 14j gratuit »
   │     → downloads.upgradedbikes.com/AtelierVeloPlus-Setup.exe
   │        (bucket R2 atelier-velo-downloads, compte 967b3a3e, custom domain actif)
   │     → installe → trial 14 j auto au 1er lancement
   │
   └─ « Acheter » (Basique 199 / Pro 359 / Pro Lifetime 599)
         → Worker atelier-velo-api-prod (compte 6504582e) → Stripe Checkout LIVE
         → paiement réel → webhook → commande en D1 prod
         → email d'activation (atelier-velo-plus@upgradedbikes.com via Resend)
           contenant le CODE + lien de téléchargement
         → client colle le code dans l'app → /license/redeem (Worker) → licence activée
```

**Testé en réel** : un achat Basique a été payé (Stripe live), email reçu, puis remboursé. ✅

---

## 3. Infrastructure déployée

### Comptes Cloudflare (IMPORTANT — il y en a deux)
| Compte | ID | Email | Contient |
|---|---|---|---|
| Workers API | `6504582e534d21b0d3526993a0cb5864` | jeromeley.apps@gmail.com | Workers test + prod, bucket auto-update |
| Domaine | `967b3a3e89ce01b779900c875c952e40` | jeromeleyssard@gmail.com | upgradedbikes.com (DNS), page tarifs, bucket downloads, tunnel RDV |

> ⚠️ Cette séparation est la source de la plupart des frictions. Pour déployer la page tarifs
> ou gérer downloads, il faut être sur le compte **967b3a3e**. Pour les workers API, **6504582e**.

### Workers Cloudflare
- `atelier-velo-api` (TEST) — `atelier-velo-api.upgradedbikes.workers.dev` — clés `sk_test_`
- `atelier-velo-api-prod` (LIVE) — `atelier-velo-api-prod.upgradedbikes.workers.dev` — clés `sk_live_`
  - 9 secrets prod : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 3× STRIPE_PRICE, LICENSE_PRIVATE_KEY_PEM, RESEND_API_KEY, EMAIL_FROM, APP_PUBLIC_URL
  - D1 prod : `atelier-velo-orders-prod` (migrée, tables orders + purchase_tokens)
  - Webhook Stripe live configuré (checkout.session.completed, payment_intent.payment_failed)

### Buckets R2
- `atelier-velo-updates` (compte 6504582e) — auto-update electron (URL `pub-90ecfd3c…r2.dev`)
- `atelier-velo-downloads` (compte 967b3a3e) — installateur, custom domain `downloads.upgradedbikes.com` ✅

### Email
- Domaine `upgradedbikes.com` vérifié sur Resend (DKIM/SPF dans le DNS Cloudflare).
- Expéditeur : `atelier-velo-plus@upgradedbikes.com`.

### Stripe (mode LIVE actif)
- Produits live : Basique `price_1TdFvDDQon47FdsBzIV7IJhC`, Pro `price_1TdFvEDQon47FdsBHpDovstk`,
  Pro Lifetime `price_1TdFvFDQon47FdsBgEA4Y8Kp`.
- Webhook live → worker prod.

---

## 4. L'application (build)

- **Installateur NSIS** : `dist-electron/Atelier Velo+-1.1.0-win-x64.exe` (~396 Mo).
  - Vrai assistant d'installation (raccourcis bureau/menu, désinstalleur).
  - URLs prod inlinées (activation → worker prod, achat → tarifs.upgradedbikes.com).
  - schema.sql complet (41 tables dont les V2).
  - Signé avec un certificat **auto-signé** → SmartScreen affiche encore « Éditeur inconnu ».
- **Build reproductible** : `npm run build && npm run build:electron`. Le prebuild nettoie
  `.next/cache` (sinon les variables NEXT_PUBLIC ne s'inlinent pas — bug corrigé).
- **Auto-update** : code prêt (electron-updater + bucket R2). S'activera à la prochaine version
  publiée via `scripts/publish-update-r2.mjs`. La v1.1.0 actuelle est la version de base.

---

## 5. Fonctionnalités livrées cette session

### Sécurité (Sprint 0)
JWT renforcé, secrets rotés, bypass Electron fermé (token de session), CSP, webSecurity réactivé.

### Qualité (Sprint 1)
514 tests verts, 0 warning ESLint, TypeScript clean (flags partiels), CI Playwright, cron licences
anti-doublon, email facture avec PDF.

### Commercialisation (Sprints 2-5)
Architecture serverless (Workers + Pages), page tarifs, Stripe checkout, génération licence auto,
export FEC, sauvegarde SQLite auto, paiement Stripe client sur facture, activation 1-clic,
système de vente live déployé et testé.

### UX (Sprint 6)
Mode avancé (masque le jargon technique), footers dédupliqués, nom perso retiré, entités HTML
corrigées, 14 flux RSS vélo vérifiés, email de marque.

### Features métier V2
- Signature numérique client (accord avant travaux) — canvas
- Bon de dépôt (état du vélo à l'entrée + signature)
- Forfaits / packs (MO + pièces prédéfinis, application 1-clic)
- Acomptes (enregistrement + reçu PDF + déduction facture)

---

## 6. Documentation produite (docs/)

| Fichier | Contenu |
|---|---|
| `MARKETING-BRIEF.md` | Positionnement, features par bénéfice, pricing, objections, canaux |
| `plan-V2-fiscalisation.md` | Implémentation technique ISCA, chaînage, clôtures, Factur-X, SQLCipher |
| `plan-certification-crm.md` | Volet légal/business de la conformité fiscale |
| `plan-signature-code.md` | SmartScreen, Trusted Signing, options certificat |
| `TODO-DEPLOIEMENT.md` | Checklist déploiement pas-à-pas |
| `pages-tarifs/DEPLOY-PROD.md` | Déploiement page tarifs (compte domaine) |
| Rapports SPRINT-0 à 6 | Détail de chaque sprint |

---

## 7. Ce qui reste à faire

### 🔴 Court terme (avant promotion active)
1. **Redéployer la page tarifs** : les corrections (wording, bouton download) sont dans le code
   `pages-tarifs/` mais pas encore en ligne. Re-drag&drop sur le projet Pages (compte 967b3a3e).
2. **Mettre à jour `APP_PUBLIC_URL` du worker prod** vers `https://tarifs.upgradedbikes.com`
   (actuellement l'ancienne URL) puis `npm run deploy:prod`.
3. **Tester l'activation d'un code sur une machine/VM neuve** — seul maillon non retesté en prod
   (valide que le .exe distribué pointe bien sur le worker prod).

### 🟡 Moyen terme (confiance / pro)
4. **Microsoft Trusted Signing** : entité SIRET 3+ ans → éligible. Clarifier le statut de
   l'inscription « Microsoft Trust » déjà faite, brancher la signature dans electron-builder
   (`forceCodeSigning: true`). Supprime le warning « Éditeur inconnu ». Voir `plan-signature-code.md`.
5. **Durcissement secrets par installation** : actuellement JWT_SECRET/ENCRYPTION_KEY identiques
   dans tous les builds. Générer par installation au 1er lancement.
6. **Réduire la taille de l'installateur** (396 Mo, lourd à télécharger) — optimisation Electron.

### 🔵 Long terme (élargir le marché)
7. **Conformité fiscale ISCA** (`plan-V2-fiscalisation.md`) : verrouillage factures émises,
   chaînage cryptographique, clôtures Z, archivage scellé → permet de vendre aux **sociétés et
   assujettis TVA** + signer l'attestation individuelle. Aujourd'hui la cible micro-entreprise
   (franchise TVA) est **exemptée**, donc non bloquant pour démarrer.
8. **Factur-X** : obligatoire pour micro à partir de sept. 2027 (réception 2026).
9. **Pricing** : observer les ventes (le Lifetime à 599€ risque de cannibaliser l'annuel Pro à
   359€ — rentable en ~1,9 an). Ajuster avec les vraies données dans quelques mois.
10. **macOS** : exclu tant que Windows ne génère pas de revenu (décision initiale).

---

## 8. Commandes utiles (mémo)

```bash
# Build complet (Next + installateur NSIS)
npm run build && npm run build:electron

# Publier une mise à jour auto-update (compte 6504582e)
#   variables R2_* du compte workers
node scripts/publish-update-r2.mjs

# Publier un nouvel installateur sur downloads (compte 967b3a3e)
#   variables R2_* du compte domaine
node scripts/publish-installer-r2.mjs

# Worker prod (clés live)
cd workers && npm run deploy:prod

# Worker test
cd workers && npm run deploy

# Outil support licence (transfert machine)
node scripts/support-license.mjs lookup <email>
node scripts/support-license.mjs reset <code>

# Tests / qualité
npx jest --silent ; npx tsc --noEmit ; npx eslint src --ext .ts,.tsx --max-warnings=0
```

---

## 9. Points de vigilance pour la reprise

- **Deux comptes Cloudflare** : toujours vérifier sur lequel on agit (workers = 6504582e,
  domaine = 967b3a3e). wrangler ne voit qu'un compte à la fois selon le login.
- **Cache .next** : si une variable NEXT_PUBLIC ne s'inline pas, vérifier que le build a bien
  nettoyé `.next/cache` (c'est dans le prebuild maintenant).
- **Prix Stripe immuables** : changer un prix = recréer le produit (test + live), pas d'édition.
- **Branche `refonte-2026`** : ~70 commits. À merger sur `windows`/`main` quand validé en prod.
- **Secrets** : ne jamais coller `sk_live_`, clés R2, ou Resend dans un chat. `.env*` sont gitignorés.

---

*Excellente session. Le produit est prêt à vendre. Les prochaines étapes sont des finitions,
pas des bloquants.*
