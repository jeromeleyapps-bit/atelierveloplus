# PLAN EXPERT BUILD ELECTRON - 5 DÉCEMBRE 2025

**Auteur** : Analyse experte basée sur les Règles d'Or et Méthodologie AGILE 7 étapes  
**Objectif** : Résoudre ENAMETOOLONG et produire des builds NSIS/Portable fonctionnels  
**Statut** : 🔴 CRITIQUE - Bloquant pour distribution

---

## 📊 DIAGNOSTIC COMPLET (Étape 1-2 AGILE : TESTER + OBSERVER)

### Métriques Actuelles Vérifiées

| Métrique | Valeur | Impact |
|----------|--------|--------|
| **Fichiers node_modules complet** | 110 149 | 🔴 CRITIQUE |
| **Fichiers avec --omit=dev** | 76 063 | 🟠 Encore trop |
| **Limite Windows ligne commande** | ~8 191 chars | Dépassée |
| **Modules dans dependencies** | 49 | À auditer |
| **Modules dans devDependencies** | 38 | Correctement exclus |

### Top 10 Consommateurs de Fichiers (VÉRIFIÉ)

| Module | Fichiers | Nécessaire Runtime ? | Action |
|--------|----------|---------------------|--------|
| **@mui** | 37 797 | ❌ Bundlé dans .next/ | EXCLURE |
| **@hubspot/api-client** | 8 340 | ❌ NON UTILISÉ | SUPPRIMER |
| **next** | 5 857 | ✅ Oui | GARDER |
| **date-fns** | 5 326 | ✅ Oui | OPTIMISER |
| **happy-dom** | 2 902 | ❌ Tests uniquement | EXCLURE |
| **@typescript-eslint** | 2 715 | ❌ Dev uniquement | EXCLURE |
| **effect** | 2 699 | ❌ Via prisma dev | EXCLURE |
| **es-toolkit** | 2 655 | ⚠️ Via recharts | ÉVALUER |
| **es-abstract** | 2 480 | ❌ Dev uniquement | EXCLURE |
| **rxjs** | 2 277 | ⚠️ Via @hubspot | SUPPRIMER |

### Chaînes de Dépendances Problématiques (VÉRIFIÉ)

```
@hubspot/api-client (8340 fichiers) ← NON UTILISÉ DANS LE CODE
  └── @aws-sdk/* (1593 fichiers)
  └── @smithy/* (1563 fichiers)
  └── rxjs (2277 fichiers)
  └── lodash (1054 fichiers)
  TOTAL: ~14 827 fichiers INUTILES

effect (2699 fichiers) ← Via prisma (devDependency)
  └── fast-check (1019 fichiers)
  TOTAL: ~3 718 fichiers (devrait être exclu avec --omit=dev)

recharts (742 fichiers)
  └── es-toolkit (2655 fichiers)
  TOTAL: ~3 397 fichiers (nécessaire mais lourd)
```

---

## 🎯 CAUSE RACINE IDENTIFIÉE

### Pourquoi `npm ci --omit=dev` ne suffit pas ?

1. **@hubspot/api-client** est dans `dependencies` mais **JAMAIS utilisé** dans le code
2. **@mui** (37 797 fichiers) est dans `dependencies` mais **déjà bundlé** dans `.next/`
3. **recharts** tire **es-toolkit** (2 655 fichiers) comme dépendance transitive
4. Le script `prepare-build-optimized.js` copie **TOUT** node_modules prod

### Pourquoi le mode `standalone` est désactivé ?

D'après mes recherches dans le code et les mémoires :
- Commentaire `next.config.js` ligne 8 : `// Mode standalone DÉSACTIVÉ`
- Raison historique : Bug Windows EINVAL avec Next.js 16 (mémoire système)
- Conséquence : Pas de tree-shaking automatique des node_modules

---

## ✅ SOLUTIONS PROPOSÉES (Étape 3 AGILE : CORRIGER)

### SOLUTION A : Nettoyage Agressif package.json (RECOMMANDÉE - IMMÉDIAT)

**Gain estimé : -50 000 fichiers (de 76k à ~26k)**

#### A.1 Supprimer @hubspot/api-client

```bash
npm uninstall @hubspot/api-client
```

**Vérification** : `grep -r "@hubspot" src/` → 0 résultats ✅

**Gain** : -14 827 fichiers (hubspot + aws-sdk + smithy + rxjs + lodash)

#### A.2 Déplacer @mui vers devDependencies

**Raison** : @mui est utilisé côté client, bundlé par Next.js dans `.next/static/`
Le runtime serveur n'a PAS besoin de @mui dans node_modules.

```json
// package.json - DÉPLACER vers devDependencies
"devDependencies": {
  "@mui/icons-material": "^5.15.0",
  "@mui/material": "^5.15.0",
  "@mui/x-data-grid": "^6.18.7",
  "@emotion/cache": "^11.14.0",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  // ... existants
}
```

**Gain** : -37 797 fichiers

#### A.3 Déplacer modules client-only vers devDependencies

```json
// package.json - DÉPLACER vers devDependencies
"devDependencies": {
  "@fullcalendar/core": "^6.1.19",
  "@fullcalendar/daygrid": "^6.1.19",
  "@fullcalendar/interaction": "^6.1.19",
  "@fullcalendar/react": "^6.1.19",
  "@fullcalendar/timegrid": "^6.1.19",
  "framer-motion": "^12.23.22",
  "html5-qrcode": "^2.3.8",
  "recharts": "^3.3.0",
  "@tanstack/react-query": "^5.90.5",
  "@tanstack/react-query-devtools": "^5.90.2",
  // ... existants
}
```

**Gain** : -8 000 fichiers supplémentaires

#### A.4 Supprimer dépendances inutilisées (CONFIRMÉ PAR DEPCHECK)

```bash
# Résultat depcheck - Dépendances NON UTILISÉES dans le code :
npm uninstall @hubspot/api-client    # 8340+ fichiers
npm uninstall @supabase/supabase-js  # ~750 fichiers
npm uninstall @upstash/ratelimit     # ~100 fichiers
npm uninstall @upstash/redis         # ~100 fichiers
npm uninstall glob-to-regexp         # ~10 fichiers
npm uninstall next-electron-server   # ~50 fichiers
npm uninstall webpack-hot-middleware # ~100 fichiers (dev only)

# ATTENTION: NE PAS supprimer watchpack (nécessaire pour Next.js)
# ATTENTION: NE PAS supprimer jsonwebtoken (utilisé via jose)
# ATTENTION: NE PAS supprimer micromatch (utilisé par Next.js)
```

**Gain estimé** : ~9 450 fichiers supplémentaires

---

### SOLUTION B : Liste Blanche Stricte (COMPLÉMENTAIRE)

Modifier `prepare-build-optimized.js` pour copier UNIQUEMENT les modules serveur :

```javascript
// LISTE BLANCHE STRICTE - Modules SERVEUR uniquement
const SERVER_ONLY_MODULES = [
  // Core Next.js (OBLIGATOIRE)
  'next', '@next/env', 'styled-jsx', '@swc/helpers',
  'caniuse-lite', 'postcss', 'watchpack', 'graceful-fs',
  
  // React Core (OBLIGATOIRE)
  'react', 'react-dom',
  
  // Database (OBLIGATOIRE)
  '@prisma/client', '.prisma',
  
  // Images (OBLIGATOIRE)
  'sharp', '@img', 'detect-libc', 'color', 'color-string',
  'color-convert', 'color-name', 'simple-swizzle', 'semver',
  
  // Auth & Security (OBLIGATOIRE)
  'jsonwebtoken', 'jose', 'bcryptjs',
  
  // Email (OBLIGATOIRE)
  'nodemailer',
  
  // Utilities (OBLIGATOIRE)
  'date-fns', 'zod', 'dotenv', 'fs-extra', 'axios', 'micromatch',
  
  // Cron & PDF (SI UTILISÉ SERVEUR)
  'node-cron', 'pdf-lib',
  
  // Licensing (OBLIGATOIRE)
  'node-machine-id', 'hw-fingerprint',
];

// EXCLURE EXPLICITEMENT (déjà bundlés ou inutiles)
const EXCLUDE_MODULES = [
  '@mui', '@emotion', '@fullcalendar', 'recharts', 'framer-motion',
  '@tanstack', 'html5-qrcode', '@hubspot', '@aws-sdk', '@smithy',
  'rxjs', 'effect', 'fast-check', 'es-toolkit', 'es-abstract',
  'happy-dom', 'jsdom', '@babel', '@typescript-eslint', 'typescript',
  'eslint', 'jest', 'playwright', '@playwright', '@jest',
];
```

---

### SOLUTION C : Réactiver Standalone avec Workaround (LONG TERME)

Le mode `standalone` de Next.js est LA solution officielle pour réduire node_modules.

**Problème historique** : Bug Windows EINVAL avec Next.js 16

**Workaround possible** :
1. Activer `output: 'standalone'` dans `next.config.js`
2. Copier `.next/standalone/` au lieu de `.next/` + node_modules
3. Le standalone contient UNIQUEMENT les modules tracés (~3000 fichiers)

```javascript
// next.config.js
const nextConfig = {
  output: 'standalone',  // RÉACTIVER
  // ...
};
```

**Gain potentiel** : De 76 000 fichiers à ~3 000 fichiers

**Risque** : Nécessite tests approfondis pour vérifier que le bug EINVAL est résolu.

---

## 📋 PLAN D'EXÉCUTION RECOMMANDÉ

### Phase 1 : Nettoyage Immédiat (30 min)

```powershell
# 1. Supprimer @hubspot (non utilisé)
npm uninstall @hubspot/api-client

# 2. Vérifier dépendances inutilisées
npm run audit:deps

# 3. Rebuild
npm run build
npm run postbuild

# 4. Compter fichiers
(Get-ChildItem electron-resources/web/npm_modules -Recurse -File).Count
```

**Objectif** : Passer de 76 000 à ~60 000 fichiers

### Phase 2 : Déplacement vers devDependencies (1h)

1. Modifier `package.json` (déplacer @mui, @fullcalendar, recharts, etc.)
2. `npm install` pour régénérer package-lock.json
3. Rebuild et test

**Objectif** : Passer de 60 000 à ~20 000 fichiers

### Phase 3 : Liste Blanche Stricte (2h)

1. Modifier `prepare-build-optimized.js` avec liste blanche
2. Tester que l'application fonctionne
3. Ajuster la liste si modules manquants

**Objectif** : Passer de 20 000 à ~8 000 fichiers

### Phase 4 : Test Build NSIS (30 min)

```powershell
npm run build:electron
```

**Objectif** : Build NSIS réussi sans ENAMETOOLONG

---

## ⚠️ POINTS DE VIGILANCE

### Modules à NE PAS Déplacer vers devDependencies

Ces modules sont utilisés côté SERVEUR (API routes, SSR) :

- `next` - Core framework
- `react`, `react-dom` - SSR
- `@prisma/client` - Database
- `sharp` - Image processing API
- `nodemailer` - Email API
- `jsonwebtoken`, `jose`, `bcryptjs` - Auth API
- `date-fns` - Date formatting API
- `zod` - Validation API
- `pdf-lib` - PDF generation API
- `axios` - HTTP requests API
- `dotenv` - Environment variables
- `fs-extra` - File operations
- `node-cron` - Scheduled tasks
- `node-machine-id`, `hw-fingerprint` - Licensing

### Vérification Post-Modification

Après chaque modification, tester :

```powershell
# 1. Build Next.js
npm run build

# 2. Démarrer en mode prod
npm run start

# 3. Tester les fonctionnalités critiques
# - Login/Auth
# - CRUD clients
# - Génération PDF
# - Upload images
# - Envoi emails
```

---

## 📊 ESTIMATION DES GAINS

| Phase | Fichiers Avant | Fichiers Après | Gain |
|-------|---------------|----------------|------|
| Initial | 110 149 | - | - |
| --omit=dev | 76 063 | - | -34 086 |
| Suppr. @hubspot | 76 063 | ~61 000 | -15 000 |
| Dépl. @mui | ~61 000 | ~23 000 | -38 000 |
| Dépl. autres UI | ~23 000 | ~15 000 | -8 000 |
| Liste blanche | ~15 000 | ~8 000 | -7 000 |
| **TOTAL** | **110 149** | **~8 000** | **-102 000** |

**Réduction : 93%**

---

## 🎯 CONCLUSION

### Action Immédiate Recommandée

1. **Supprimer `@hubspot/api-client`** - Gain immédiat de 15 000 fichiers
2. **Déplacer `@mui` vers devDependencies** - Gain de 38 000 fichiers
3. **Tester le build NSIS**

### Si ENAMETOOLONG Persiste

Implémenter la liste blanche stricte dans `prepare-build-optimized.js`

### Solution Long Terme

Réactiver le mode `standalone` de Next.js après tests approfondis.

---

**Méthodologie** : AGILE 7 étapes (Tester → Observer → Corriger → Confronter → Vérifier → Re-corriger → Valider)  
**Règles d'Or appliquées** : #1 DRY, #2 Correction Globale, #5 Vérification Systématique, #7 Zéro Tolérance Erreurs  
**Sources** : 
- Next.js Docs (Output File Tracing)
- electron-builder GitHub Issues (#5210, #4725)
- npm documentation (--omit=dev)
- Analyse directe du code source

