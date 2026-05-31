# État du projet Atelier Vélo+ — 30 mai 2026

> Point de situation complet en fin de session. Branche de travail : `refonte-2026`.

---

## 1. Vue d'ensemble

Atelier Vélo+ est passé, en plusieurs sessions, d'une **application métier solide mais non commercialisable** à un **produit vendable avec un tunnel d'achat automatique fonctionnel** (en mode test). Le cœur métier était déjà excellent ; le travail a porté sur la sécurité, la qualité, l'architecture de vente, l'UX et de nouvelles fonctionnalités terrain.

**État global : produit prêt à vendre aux micro-entreprises, en mode test Stripe. Reste le passage en réel + finitions.**

---

## 2. Ce qui a été accompli (par thème)

### Sécurité (Sprint 0)
- Rotation des secrets (JWT, chiffrement) — anciens secrets 16 hex cassables remplacés par 64 octets
- Suppression du bypass auth cross-process (token de session Electron)
- Durcissement BrowserWindow (webSecurity, CSP)
- `package.json` nettoyé (mojibake 504 Ko → 6 Ko)

### Build & qualité (Sprint 1)
- 504 → **514 tests verts**, 0 warning ESLint, 0 erreur TypeScript
- ESLint `no-console` + `no-warning-comments` activés
- CI Playwright ajoutée
- Bug "page blanche tickets au 1er lancement" corrigé (race AuthContext)
- Email facture avec PDF en pièce jointe (dédoublonné)
- Cron licences anti-doublon

### Architecture de vente (Sprints 2-3-5)
- **Correction majeure** : l'app est 100 % locale (pas de serveur). Toute la logique serveur (paiement, génération licence) a été déplacée vers **Cloudflare Workers + D1** (déployés et fonctionnels).
- Tunnel d'achat **automatique de bout en bout** (testé) :
  page tarifs → Stripe Checkout → webhook → génération code → email → activation 1-clic dans l'app
- **Domaine email vérifié** : les codes partent de `atelier-velo-plus@upgradedbikes.com` (Resend + DNS Cloudflare)
- Paiement Stripe client sur facture (lien de paiement)
- Saisie manuelle des clés Stripe atelier (chiffrées)
- Export FEC comptable
- Sauvegarde SQLite auto + restore 1-clic
- Outil support de transfert de licence (endpoints Worker)

### UX (Sprint 6)
- **Mode "Avancé"** activable : interface épurée pour l'atelier, options techniques masquées par défaut
- Nettoyage Mon compte / Licence / Paramètres (jargon technique relégué)
- Footer dédupliqué + nom personnel retiré de l'UI
- Décodage complet des entités HTML (titres RSS + accents)
- **14 flux RSS vélo** vérifiés actifs (vs 8)

### Distribution (cette session)
- **Vrai installateur NSIS** (`.exe` avec assistant) — fini le ZIP
- Bug critique corrigé : cache webpack obsolète qui cassait l'activation dans le build
- Cache nettoyé automatiquement à chaque build (non-régression)

### Nouvelles fonctionnalités V2 (cette session)
- **Signature numérique** client (pad canvas)
- **Bon de dépôt** (état du vélo + signature à l'entrée)
- **Forfaits / packs** (MO + pièces, ajout 1-clic)
- **Acomptes** (enregistrement + reçu PDF + numéro auto)

### Documentation produite
- `PLAN-REFONTE-2026.md`, rapports Sprint 0/1/3/4/6
- `docs/TODO-DEPLOIEMENT.md` (procédure de mise en ligne pas-à-pas)
- `docs/MARKETING-BRIEF.md` (positionnement, features par bénéfice, objections, canaux)
- `docs/plan-certification-crm.md` (volet légal certification)
- `docs/plan-V2-fiscalisation.md` (volet technique ISCA + Factur-X)

---

## 3. Ce qui est en attente

### 🔴 Bloquant avant vente réelle
| Tâche | Détail |
|---|---|
| **Stripe mode Live** | Produits live, secrets live sur le Worker (`--env production`), webhook live |
| **Test de l'installateur NSIS** | À valider : installer + activer un code (procédure en cours côté utilisateur) |

### 🟡 Recommandé
| Tâche | Détail |
|---|---|
| **Microsoft Trusted Signing** | À vérifier sur Azure. Si approuvé → installateur signé → fini le "Éditeur inconnu" SmartScreen. ~10 $/mois. Le plus impactant pour la confiance. |
| **Auto-update R2** | electron-updater + bucket Cloudflare R2 (gratuit) pour pousser les futures versions |
| **Domaine propre page tarifs** | `tarifs.upgradedbikes.com` au lieu de l'URL `shy-frost-f8d0.workers.dev` |
| **Secrets par installation** | Durcissement : générer JWT/ENCRYPTION_KEY uniques par install (actuellement partagés dans le build) |

### 🟢 Finitions V2
- Déduction des acomptes sur la facture finale (affichage "reste à payer")
- Signature reportée sur le PDF du devis

### 🔵 Long terme
- Conformité fiscale complète (plan ISCA → vente aux sociétés/assujettis TVA)
- Factur-X (obligatoire 2026/2027)
- Couverture de tests sur le cœur facturation (actuellement ~7 %)
- Migration Next 13→15, TypeScript strict complet
- macOS (exclu tant que Windows ne vend pas)

---

## 4. Mes réflexions & suggestions (regard senior)

### Stratégie commerciale
- **Vends MAINTENANT aux micro-entreprises** (exemptées de certification fiscale). Ne te bloque pas en attendant la conformité ISCA — c'est un marché immédiat et légal.
- **Le frein n°1 reste le "Éditeur inconnu"**. Si Microsoft Trusted Signing est approuvé, c'est LE déblocage le plus rentable (10 $/mois vs 150 €/an EV). À prioriser dès que tu reviens.
- Le **Pro Lifetime à 599 €** est ton meilleur produit marketing (achat unique vs abonnement concurrent). Mets-le en avant.

### Technique
- **Le bug de cache webpack découvert ce soir était sérieux** : sans la correction, tu aurais distribué un installateur où l'activation ne marche pas. Bien joué d'avoir questionné le ZIP, ça l'a révélé. Leçon : toujours tester l'activation sur le build packagé, pas seulement en dev.
- **Secrets partagés dans le build** : à durcir avant distribution massive. Risque modéré (app locale) mais réel pour les clés Stripe atelier chiffrées.
- **Couverture de tests à 7 %** : acceptable pour avancer, mais le cœur facturation/TVA mériterait des tests avant la conformité fiscale (où une erreur de calcul = problème légal).

### Produit
- Les 4 features V2 sont d'excellentes idées terrain. La **signature** est le meilleur argument de démo (effet "waouh", valeur légale du bon de dépôt).
- Pense à des **captures/GIF** des fonctionnalités phares pour le site et les pubs — tu en auras besoin pour le marketing.

### Priorisation suggérée pour la reprise
1. **Tester l'installateur NSIS** (valider l'activation sur le build)
2. **Microsoft Trusted Signing** (vérifier Azure → signer si possible)
3. **Stripe Live** (quand prêt commercialement)
4. **Auto-update R2** (pour la maintenance future)
5. Finitions V2 + marketing

---

## 5. Repères techniques pour reprendre

- **Branche** : `refonte-2026` (tout y est commité)
- **Worker déployé** : `https://atelier-velo-api.upgradedbikes.workers.dev` (compte Cloudflare `6504582e...`, épinglé dans `workers/wrangler.toml`)
- **Page tarifs** : `https://shy-frost-f8d0.upgradedbikes.workers.dev`
- **Installateur** : `dist-electron/Atelier Velo+-1.1.0-win-x64.exe`
- **Build complet** : `npm run build` PUIS `npm run build:electron` (les deux, dans l'ordre)
- **Tests** : `npm test` (514 verts) · **Lint** : `npm run lint:ci` · **Types** : `npm run typecheck`
- **Compte Resend** : `jeromeley.apps@gmail.com`, domaine `upgradedbikes.com` vérifié
- **2 comptes Cloudflare** : A (`jeromeley.apps`) = workers + kyklostroc/synodea ; B (`967b3a3e...`) = tunnel + zone DNS upgradedbikes.com

---

*Bonne nuit. Le produit est en très bon état. La prochaine grande étape, c'est la signature de code (confiance) + le passage Live.*
