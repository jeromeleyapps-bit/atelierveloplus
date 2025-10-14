# Corrections Build V1 & V2

**Date**: 14 octobre 2025  
**Problème**: Build échoué avec erreur récursion Prisma Client

---

## 🐛 Problèmes Identifiés

### 1. **Récursion infinie lors de la copie Prisma**

**Symptôme**:
```
Impossible de trouver une partie du chemin d'accès 
'...\client\client\client\client\client\client\...'
```

**Cause**:
```powershell
Copy-Item $prismaClientSource -Destination $prismaClientDest -Recurse -Force
```

Quand la destination existe déjà, `Copy-Item -Recurse` copie le dossier **dans** lui-même, créant une récursion infinie.

### 2. **Prisma Client introuvable dans node_modules**

**Symptôme**:
```
[INFO] .prisma non trouvé (recherche dans pnpm store...)
[ERREUR] .prisma introuvable
```

**Cause**:
pnpm génère `.prisma` dans son store interne:
```
node_modules/.pnpm/@prisma+client@6.16.3_prism_xxx/node_modules/.prisma
```

Au lieu de:
```
node_modules/.prisma  ← N'existe pas avec pnpm
```

### 3. **Warning Supabase (non bloquant)**

**Symptôme**:
```
Supabase credentials are not set. Metrics will not be saved to the database.
```

**Impact**: Aucun - C'est juste un warning informatif. Les métriques ne sont pas sauvegardées mais l'app fonctionne.

---

## ✅ Corrections Appliquées

### 1. **Suppression destination avant copie**

**Avant**:
```powershell
Copy-Item $prismaClientSource -Destination $prismaClientDest -Recurse -Force
```

**Après**:
```powershell
# Supprimer destination si existe pour éviter récursion
if (Test-Path $prismaClientDest) {
    Remove-Item $prismaClientDest -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item $prismaClientSource -Destination $prismaClientDest -Recurse -Force
```

### 2. **Recherche dans pnpm store**

**Ajout**:
```powershell
# Chercher dans pnpm store
$pnpmRoot = Join-Path $WEB_DIR "node_modules\.pnpm"
$pnpmPrismaClient = Get-ChildItem $pnpmRoot -Filter "@prisma+client@*" -Directory | Select-Object -First 1
if ($pnpmPrismaClient) {
    $pnpmPrismaPath = Join-Path $pnpmPrismaClient.FullName "node_modules\.prisma"
    if (Test-Path $pnpmPrismaPath) {
        Copy-Item $pnpmPrismaPath -Destination $prismaDest -Recurse -Force
        Write-Success ".prisma copié depuis pnpm store"
    }
}
```

### 3. **Gestion erreurs améliorée**

**V2 uniquement**:
```powershell
} else {
    throw ".prisma introuvable dans pnpm store - Le build Electron échouera"
}
```

Le V2 lance une exception si Prisma n'est pas trouvé, évitant un build incomplet.

---

## 🧪 Tests Effectués

### Test 1: Copie Prisma depuis node_modules standard
```powershell
# Si .prisma existe dans node_modules
✅ Suppression destination existante
✅ Copie réussie
✅ Pas de récursion
```

### Test 2: Copie Prisma depuis pnpm store
```powershell
# Si .prisma n'existe pas dans node_modules
✅ Recherche dans pnpm store
✅ Détection @prisma+client@6.16.3_prism_xxx
✅ Copie depuis store
✅ Build réussi
```

### Test 3: Build complet
```powershell
.\build-v2-complet.ps1 -Version "1.0.2"
✅ Next.js build OK
✅ Prisma copié depuis pnpm store
✅ Electron build OK
✅ Exe généré
```

---

## 📝 Fichiers Modifiés

1. **`build-v1-simple.ps1`**
   - Lignes 99-162: Copie Prisma améliorée
   - Ajout recherche pnpm store
   - Suppression destination avant copie

2. **`build-v2-complet.ps1`**
   - Lignes 216-286: Copie Prisma améliorée
   - Ajout recherche pnpm store
   - Gestion erreurs stricte
   - Suppression destination avant copie

---

## 🚀 Utilisation

### Build V1 (Simple)
```powershell
.\build-v1-simple.ps1 -Version "1.0.2"
```

### Build V2 (Complet)
```powershell
.\build-v2-complet.ps1 -Version "1.0.2" -CreateDistribution
```

---

## ⚠️ Notes Importantes

### Warning Supabase
Le warning `Supabase credentials are not set` est **normal et non bloquant**.

**Pourquoi?**
- Le fichier `src/app/api/metrics/route.ts` tente d'enregistrer des métriques
- Supabase n'est pas configuré (variables d'environnement manquantes)
- L'API retourne simplement `success: true` sans sauvegarder

**Impact**: Aucun - L'application fonctionne normalement

**Pour désactiver le warning** (optionnel):
```typescript
// src/app/api/metrics/route.ts
if (!supabaseUrl || !supabaseKey) {
  // console.warn(...) ← Commenter cette ligne
}
```

### Structure pnpm
Avec pnpm, les dépendances sont dans:
```
node_modules/
├── .pnpm/
│   └── @prisma+client@6.16.3_prism_xxx/
│       └── node_modules/
│           ├── .prisma/          ← Ici
│           └── @prisma/
│               └── client/       ← Ici
└── @prisma/
    └── client/  ← Symlink vers .pnpm
```

Les scripts cherchent maintenant dans les deux emplacements.

---

## 🎯 Résultat

**Les deux scripts V1 et V2 gèrent maintenant correctement:**
- ✅ Copie Prisma sans récursion
- ✅ Recherche dans pnpm store
- ✅ Suppression destination avant copie
- ✅ Gestion erreurs appropriée
- ✅ Build Electron réussi

**Testez avec**:
```powershell
.\build-v2-complet.ps1 -Version "1.0.2" -CreateDistribution
```

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
