# Atelier Vélo+ — Reprendre ici

> Point de reprise unique. Mis à jour le **15 août 2026** (fin de session d'assainissement).
> Compléments : `AUDIT-STACK-AOUT2026.md` (audit technique), `ETAT-PROJET-01JUIN2026.md`
> (carte d'infrastructure : comptes Cloudflare, workers, R2, Stripe).

---

## En une phrase

Le socle technique vient d'être assaini de fond en comble — sécurité, fins de vie,
framework — mais **rien n'est encore publié** : le site et l'installateur en ligne datent
toujours de fin mai (v1.1.0). La prochaine étape est la construction et la publication
de la 1.2.1.

---

## Ce qui a été fait le 15 août 2026

### Correctifs bloquants
- **Wizard de première configuration** : ne terminait pas. Un jeton de session périmé
  (624 « signature verification failed » dans les journaux) faisait échouer la première
  requête sur `/api/user/profile`, seule route du flux absente des routes protégées, et
  l'erreur s'affichait hors du champ de vision. Corrigé sur les trois points.
  **Ce défaut bloque tout nouvel utilisateur dans la version actuellement en ligne.**

### Sécurité (S1–S2)
- `/api/customers` était **publique** : nom, email, téléphone et adresse de 200 clients
  accessibles sans authentification dès que le tunnel de prise de RDV publie l'origine.
  Fermée, ainsi que trois routes d'import en écriture.
- Supprimé `/api/debug/env` (exposait `DATABASE_URL` et scannait le disque) et
  `/api/test-invoice` (renvoyait toutes les factures) — reliquats livrés en production.
- **Le proxy refuse désormais par défaut** : une route oubliée est fermée, jamais ouverte.
  C'est ce défaut de conception qui avait ouvert `/api/customers` et `/api/user/profile`.
- PDF financiers et catalogue (prix d'achat, marges, fournisseurs) retirés du public.

### Dépendances et fins de vie (S3–S5)
- `axios` supprimé : 29 avis de sécurité pour une chaîne de code entièrement morte.
- 10 dépendances mortes retirées ; `undici` conservée (polyfills de test, malgré ce
  qu'en dit `depcheck`).
- **78 tests dormants réactivés** : ils étaient écrits pour Vitest, exclus de Jest, et
  n'avaient jamais tourné depuis novembre 2025 — sur `crypto`, `jwt` et la tarification.
- `electron-updater` (canal de mise à jour des clients), `nodemailer` 9, `bcryptjs` 3
  (compatibilité des mots de passe existants vérifiée et figée par un test), `zod` 4.
- **Node 20 → 22** (fin de vie en avril 2026) et **Electron 39 → 43** : les clients
  recevaient un Chromium M142 non patché depuis mai, ils auront Chromium 150.

### Framework (S6)
- **Next.js 13.5 → 16.3.1** et **React 18 → 19**. Ferme CVE-2024-51479, non corrigeable
  sur la branche 13. Convention `middleware` → `proxy`. Build en `--webpack` explicite
  (Turbopack entre en conflit avec la configuration de minification).
- **ESLint 8 (fin de vie) → 9** avec configuration plate.

**Bilan** : vulnérabilités de production 61 → 35 paquets, la critique éliminée, les hautes
de 16 à 10. Tests 514 → **625 verts**. TSC 0.

---

## À faire maintenant

### 1. Construire et publier la 1.2.1 — la priorité
Tout est prêt. La version en ligne bloque ses nouveaux utilisateurs dès le premier écran.

```bash
npm run build && npm run build:electron
node scripts/publish-installer-r2.mjs
```
Puis déployer la page tarifs (compte Cloudflare **du domaine**, `967b3a3e…`) :
```bash
cd pages-tarifs && wrangler deploy
```

### 2. Tester sur une machine neuve
Installer le `.exe` publié sur une VM : inscription, wizard complet, bascule en version
gratuite, activation d'un code. C'est le seul maillon jamais retesté de bout en bout.

### 3. Vérifier ton propre tunnel
Si `rdv.upgradedbikes.com` est actif, vérifier qu'il ne sert plus `/api/customers`.

---

## Chantiers ouverts, avec leur justification

### Les 48 erreurs ESLint (à trancher en premier)
Les règles de Next 16 remontent 48 erreurs et 411 avertissements. **Ce ne sont pas des
régressions** : le code n'a pas changé, ESLint 8 avec le preset Next 13 ne les voyait pas.
Pour l'essentiel des règles du React Compiler : 27 `setState` synchrones dans un effet
(rendus en cascade), 13 accès à une variable avant déclaration, 4 fonctions impures
pendant le rendu. Répartis sur 35 fichiers, 3 au maximum par fichier.

**La CI `ci-tests.yml` est rouge** : elle lance `lint:ci --max-warnings=0`. Le seuil n'a
pas été relâché pour masquer le problème. Corriger touche à la logique de rendu et demande
sa propre campagne de validation.

### Prisma 7 — délibérément reporté
Trois faits : Prisma 6.18 n'a **aucune vulnérabilité** ; Prisma 7 impose l'adaptateur
natif `better-sqlite3`, alors que `electron-builder.config.yml` désactive explicitement
la recompilation native (`npmRebuild: false`) *précisément à cause de better-sqlite3* ;
et 173 fichiers importent `@prisma/client`. Le risque de casser un packaging déjà délicat
(ASAR, standalone, ENAMETOOLONG) dépasse largement le bénéfice.

### MUI 5 → 9 — délibérément reporté
Quatre versions majeures sur 131 fichiers. MUI 5.18 n'est ni en fin de vie, ni vulnérable,
et déclare React 19 dans ses peerDependencies : rien ne presse.

### ESLint 10
Bloqué par `@typescript-eslint` (8.67, dernière version) qui ne fournit pas encore
l'interface attendue par ESLint 10. À reprendre quand l'écosystème suivra.

### Reste de l'audit
- **Secrets identiques dans toutes les installations** (`JWT_SECRET`, `ENCRYPTION_KEY`) :
  à générer par installation au premier lancement. C'est une rotation de ces secrets qui
  a produit le bug du wizard ; prévoir la purge des jetons devenus invalides (le mécanisme
  existe désormais via `/api/auth/me`).
- **Installateur de 396 Mo** : lourd pour un premier contact.
- **Signature de code** : SmartScreen affiche encore « Éditeur inconnu ».
- **Compteur de téléchargements** : toujours aucune donnée sur la diffusion réelle.
- **`cle stripe.txt`** à la racine : clé en clair, à supprimer une fois sauvegardée.

---

## Points de vigilance

- **108 appels `fetch` de l'interface n'envoient aucun en-tête.** Ils fonctionnent parce
  qu'Electron injecte le jeton de session sur toutes les requêtes locales. Hors Electron,
  ils échouent — c'est ce qui a fait apparaître un 401 sur les actualités du tableau de bord.
- **`nvm use 22`** a changé la version de Node globalement : les autres projets de la
  machine tournent aussi en Node 22 (réversible par `nvm use 20.18.0`).
- **Deux comptes Cloudflare** : workers API = `6504582e…`, domaine/page/downloads = `967b3a3e…`.
- **Prix Stripe immuables** : changer un prix = créer un nouveau `price_id`.
- La page tarifs déployée est `pages-tarifs/index.html` (racine du dossier).

---

## Contexte légal (vérifié en juillet 2026, rien à faire côté logiciel)

- L'obligation de « logiciel certifié » au 1er septembre 2026 **a été annulée** par la loi
  de finances 2026 (art. 125) : l'attestation individuelle de l'éditeur redevient valable.
- Septembre 2026 = obligation de **réception** des factures électroniques, côté entreprise :
  démarche administrative (s'enregistrer auprès d'une Plateforme Agréée), pas un sujet logiciel.
- La vraie échéance produit est **septembre 2027** (émission Factur-X + e-reporting).
  Plan technique : `plan-V2-fiscalisation.md`.
