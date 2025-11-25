# 📋 TODO - Corrections TypeScript pour Build Electron

## ✅ Fait Aujourd'hui

1. ✅ Configuration email Resend unifiée
2. ✅ Base SQLite unifiée (`apps/web/data/atelier-velo.db`)
3. ✅ Erreurs settings/invoices corrigées
4. ✅ Fichier 1/7 corrigé : `/api/bikes/[bikeId]/history/route.ts`

---

## ⏳ Reste à Faire (30-45 min)

### Corrections TypeScript (6 fichiers)

#### 1. `/api/bikes/search/route.ts` (4 erreurs)
**Ligne ~26** : Supprimer `mode: "insensitive"` (SQLite ne supporte pas)
```typescript
// ❌ AVANT
{ firstName: { contains: searchTerm, mode: "insensitive" } }

// ✅ APRÈS
{ firstName: { contains: searchTerm } }
```

#### 2. `/api/pos/workorders/[id]/quote-pdf/route.ts` (9 erreurs)
**Ajouter includes** :
```typescript
const workOrder = await prisma.workOrder.findUnique({
  where: { id },
  include: {
    customer: true,
    bike: true,
    lines: true  // Remplace 'parts'
  }
});
```

**Remplacer** :
- `workOrder.parts` → `workOrder.lines`
- `line.qty` → `line.quantity`
- `line.note` → `line.notes`

#### 3. `/api/pos/workorders/[id]/quote/route.ts` (6 erreurs)
**Même correction que quote-pdf**

#### 4. `/api/pos/workorders/[id]/sale/route.ts` (7 erreurs)
**Même correction que quote-pdf**

#### 5. `/finance/invoices/[id]/page.tsx` (2 erreurs)
**Ligne ~437-438** : Utiliser les bonnes propriétés
```typescript
// ❌ AVANT
qty: line.qty,
unitPriceHT: line.unitPriceHT,

// ✅ APRÈS  
qty: line.quantity,
unitPriceHT: line.priceHT,
```

#### 6. `/tickets/[id]/page.tsx` (2 erreurs)
**Ligne ~352, 366** : Supprimer prop `isAutoEntrepreneur`
```typescript
// ❌ AVANT
<LineItemSelector
  onAddLine={...}
  bikeType={...}
  isAutoEntrepreneur={isAutoEntrepreneur}  // ← Supprimer
/>

// ✅ APRÈS
<LineItemSelector
  onAddLine={...}
  bikeType={...}
/>
```

---

## 🔧 Commandes de Vérification

### Vérifier TypeScript
```powershell
cd apps/web
npm run typecheck
```

**Objectif** : 0 erreur

### Vérifier Prisma
```powershell
npx prisma validate
```

**Objectif** : Schema valide

---

## 📦 Après Corrections TypeScript

### 1. Installer Dépendances Electron
```powershell
npm install --save-dev electron electron-builder electron-is-dev
```

### 2. Ajouter Configuration Build
**Dans `apps/web/package.json`**, ajouter :
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "electron .",
    "electron:build": "electron-builder --win --x64"
  },
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
    }
  }
}
```

### 3. Build Next.js
```powershell
npm run build
```

### 4. Build Electron
```powershell
npm run electron:build
```

---

## 📊 Progression

| Étape | Status | Temps |
|-------|--------|-------|
| Config email | ✅ | Fait |
| Base SQLite | ✅ | Fait |
| Corrections TS | 🔄 1/7 | 30-45 min |
| Deps Electron | ⏳ | 5 min |
| Config build | ⏳ | 5 min |
| Build | ⏳ | 10 min |

**Total restant** : ~1h

---

## 🎯 Objectif Final

**Fichier .exe Windows** : `dist-electron/Atelier Vélo+ Setup.exe`

Prêt à être installé et testé ! 🚀
