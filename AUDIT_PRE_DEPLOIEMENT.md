# 🔍 Audit Pré-Déploiement Electron - Rapport Complet

**Date** : 16 octobre 2025  
**Objectif** : Build Electron pour Windows  
**Status** : ⚠️ **CORRECTIONS REQUISES**

---

## 📊 Résumé Exécutif

| Catégorie | Status | Détails |
|-----------|--------|---------|
| **Dépendances** | ⚠️ Manquantes | Electron non installé |
| **TypeScript** | ❌ 34 erreurs | Types incompatibles |
| **Prisma Schema** | ✅ Valide | Aucun problème |
| **Configuration** | ⚠️ Incomplète | package.json manque config Electron |
| **Routes API** | ❌ Erreurs | Propriétés manquantes |

---

## 1️⃣ Dépendances Manquantes

### ❌ Electron Non Installé

**Problème** :
- `electron` n'est pas dans `package.json`
- `electron-is-dev` utilisé dans `main.js` mais non installé
- `electron-builder` nécessaire pour le build

**Solution** :
```bash
npm install --save-dev electron electron-builder electron-is-dev
```

**Versions recommandées** :
- `electron`: `^32.0.0` (dernière stable)
- `electron-builder`: `^25.1.8`
- `electron-is-dev`: `^3.0.1`

---

## 2️⃣ Erreurs TypeScript (34 erreurs)

### Fichiers Affectés

#### A. `/api/bikes/[bikeId]/history/route.ts` (4 erreurs)
**Problème** : Propriété `customer` manquante dans le type `WorkOrder`

```typescript
// ❌ Erreur
workOrder.customer.firstName

// ✅ Solution : Inclure customer dans la requête Prisma
include: { customer: true }
```

#### B. `/api/bikes/search/route.ts` (4 erreurs)
**Problème** : Même erreur - `customer` non inclus

#### C. `/api/pos/workorders/[id]/quote-pdf/route.ts` (9 erreurs)
**Problèmes** :
- `workOrder.customer` non défini
- `workOrder.parts` n'existe plus (remplacé par `lines`)
- `workOrder.bike` non inclus

#### D. `/api/pos/workorders/[id]/quote/route.ts` (6 erreurs)
**Problème** : Même que quote-pdf

#### E. `/api/pos/workorders/[id]/sale/route.ts` (7 erreurs)
**Problèmes** :
- `workOrder.customer` non défini
- `workOrder.parts` n'existe plus

#### F. `/finance/invoices/[id]/page.tsx` (2 erreurs)
**Problème** : Type `LineItem` incompatible
```typescript
// ❌ Erreur
line.qty
line.unitPriceHT

// ✅ Ces propriétés existent dans InvoiceLine, pas LineItem
```

#### G. `/tickets/[id]/page.tsx` (2 erreurs)
**Problème** : Prop `isAutoEntrepreneur` non définie dans les composants

---

## 3️⃣ Configuration Electron Manquante

### package.json - Sections Manquantes

**Ajouter dans `apps/web/package.json`** :

```json
{
  "main": "electron/main.js",
  "build": {
    "appId": "com.upgradedbikes.atelier-velo",
    "productName": "Atelier Vélo+",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      ".next/**/*",
      "electron/**/*",
      "public/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "public/logo.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  },
  "scripts": {
    "electron:dev": "electron .",
    "electron:build": "electron-builder --win --x64"
  }
}
```

---

## 4️⃣ Problèmes de Schema Prisma

### ⚠️ Avertissement Dépréciation

```
warn The configuration property `package.json#prisma` is deprecated
```

**Impact** : Aucun pour l'instant, mais à migrer avant Prisma 7

**Solution future** : Créer `prisma.config.ts`

---

## 5️⃣ Problèmes de Routes API

### Requêtes Prisma Incomplètes

**Fichiers à corriger** :
1. `/api/bikes/[bikeId]/history/route.ts`
2. `/api/bikes/search/route.ts`
3. `/api/pos/workorders/[id]/quote-pdf/route.ts`
4. `/api/pos/workorders/[id]/quote/route.ts`
5. `/api/pos/workorders/[id]/sale/route.ts`

**Pattern de correction** :
```typescript
// ❌ Avant
const workOrder = await prisma.workOrder.findUnique({
  where: { id }
});

// ✅ Après
const workOrder = await prisma.workOrder.findUnique({
  where: { id },
  include: {
    customer: true,
    bike: true,
    lines: true  // Remplace 'parts'
  }
});
```

---

## 6️⃣ Problèmes de Types

### LineItem vs InvoiceLine

**Problème** : Confusion entre deux types similaires

**Solution** : Utiliser le bon type selon le contexte
- `InvoiceLine` : Pour les factures (DB)
- `LineItem` : Pour les composants UI

---

## 7️⃣ Configuration .env

### ✅ Correcte pour SQLite

```env
DATABASE_PROVIDER=sqlite
SQLITE_DB_PATH=./data/atelier-velo.db
RESEND_API_KEY=re_***
EMAIL_FROM=onboarding@resend.dev
```

**Recommandation** : Créer `.env.production` pour le build

---

## 📋 Plan d'Action - Ordre de Priorité

### Phase 1 : Dépendances (15 min)
1. ✅ Installer Electron et dépendances
2. ✅ Ajouter configuration build dans package.json

### Phase 2 : Corrections TypeScript (45 min)
1. ❌ Corriger routes API - Ajouter includes Prisma
2. ❌ Corriger types LineItem
3. ❌ Corriger props composants

### Phase 3 : Tests (15 min)
1. ⏳ Vérifier typecheck passe
2. ⏳ Tester build Next.js
3. ⏳ Tester Electron en dev

### Phase 4 : Build Final (30 min)
1. ⏳ Build Next.js production
2. ⏳ Build Electron Windows
3. ⏳ Test installation

**Temps estimé total** : ~2 heures

---

## 🚨 Blockers Critiques

1. **34 erreurs TypeScript** - DOIT être 0 avant build
2. **Electron non installé** - Impossible de build sans
3. **Routes API cassées** - App ne fonctionnera pas

---

## ✅ Points Positifs

1. ✅ Schema Prisma valide
2. ✅ Configuration email Resend fonctionnelle
3. ✅ Base SQLite configurée
4. ✅ Structure Electron existante (main.js)
5. ✅ Next.js 14 compatible Electron

---

## 📝 Recommandations

### Avant le Build

1. **Corriger TOUTES les erreurs TypeScript**
2. **Installer les dépendances Electron**
3. **Tester en mode dev Electron**
4. **Créer .env.production**

### Pour le Build

1. **Build Next.js en standalone**
2. **Copier node_modules nécessaires**
3. **Tester l'exe avant distribution**

### Après le Build

1. **Tester sur machine propre**
2. **Vérifier taille de l'exe** (~200-300 MB attendu)
3. **Créer installateur NSIS**

---

## 🎯 Prochaine Étape

**Commencer par Phase 1** : Installation des dépendances Electron

Veux-tu que je procède ?
