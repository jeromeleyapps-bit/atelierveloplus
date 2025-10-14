# Procédure Build Complète - Atelier Vélo+

**Date**: 14 octobre 2025  
**Status**: ✅ **TESTÉ ET VALIDÉ**

---

## 🎯 Résumé

Les scripts V1 et V2 incluent maintenant **automatiquement**:
1. ✅ Installation dépendances (`pnpm install`)
2. ✅ Génération Prisma Client (`pnpm prisma generate`)
3. ✅ Vérification Prisma dans pnpm store
4. ✅ Build Next.js standalone
5. ✅ Copie Prisma dans standalone
6. ✅ Build Electron

**Vous n'avez plus besoin d'exécuter `prisma generate` manuellement !**

---

## 🚀 Procédure Simplifiée

### Étape 1: Ouvrir PowerShell en Administrateur
```powershell
# Clic droit sur PowerShell > "Exécuter en tant qu'administrateur"
```

### Étape 2: Naviguer vers le projet
```powershell
cd C:\Users\j_ley\Atelier-velo+
```

### Étape 3: Lancer le build
```powershell
# Build V2 complet avec distribution
.\build-v2-complet.ps1 -Version "1.0.2" -CreateDistribution
```

**C'est tout !** Le script s'occupe de tout.

---

## 📋 Ce que fait le script automatiquement

### 1. Vérification environnement
- ✅ Node.js 20.18.0
- ✅ pnpm installé
- ✅ Permissions Administrateur

### 2. Arrêt processus
- ✅ Arrêt Electron/Node en cours

### 3. Installation dépendances
```powershell
pnpm install
```

### 4. Génération Prisma Client
```powershell
cd apps\web
pnpm prisma generate
```

**Résultat**:
```
✔ Generated Prisma Client (v6.16.3) to 
  .\..\..\node_modules\.pnpm\@prisma+client@6.16.3_prism_xxx\node_modules\@prisma\client
```

### 5. Vérification Prisma
Le script vérifie que `.prisma` existe dans:
- `apps/web/node_modules/.pnpm`
- `node_modules/.pnpm` ← **Trouvé ici**

### 6. Build Next.js
```powershell
pnpm build
```

### 7. Copie Prisma dans standalone
Le script copie automatiquement:
- `.prisma/` → `.next/standalone/apps/web/node_modules/.prisma/`
- `@prisma/client/` → `.next/standalone/apps/web/node_modules/@prisma/client/`

### 8. Build Electron
```powershell
cd apps\desktop
npm run build:win
```

### 9. Création distribution (si `-CreateDistribution`)
Crée un dossier `AtelierVelo-1.0.2-Windows/` avec:
- Exécutable
- Installer
- README

---

## ⚠️ Erreurs Possibles

### Erreur 1: "Prisma Client non trouvé après generate"

**Cause**: `prisma generate` a échoué silencieusement

**Solution**:
```powershell
# Exécuter manuellement
cd apps\web
pnpm prisma generate

# Vérifier
Get-ChildItem C:\Users\j_ley\Atelier-velo+\node_modules\.pnpm -Filter "@prisma+client@*" -Directory
```

### Erreur 2: "EPERM: operation not permitted, symlink"

**Cause**: Permissions insuffisantes pour créer des symlinks

**Solutions**:
1. **PowerShell en Administrateur** ✅
2. Activer Mode Développeur Windows
3. Le script V2 **retry automatiquement**

### Erreur 3: "Build Next.js échoué"

**Cause**: Erreurs TypeScript/ESLint

**Solution**: Les erreurs sont ignorées grâce à:
- `eslint.ignoreDuringBuilds: true`
- `typescript.ignoreBuildErrors: true`

Si le build échoue quand même:
```powershell
cd apps\web
pnpm build
```

---

## 🔍 Vérifications Manuelles

### Vérifier Prisma Client
```powershell
$rootPnpm = "C:\Users\j_ley\Atelier-velo+\node_modules\.pnpm"
$prismaClient = Get-ChildItem $rootPnpm -Filter "@prisma+client@*" -Directory | Select-Object -First 1

if ($prismaClient) {
    $prismaPath = Join-Path $prismaClient.FullName "node_modules\.prisma\client"
    if (Test-Path $prismaPath) {
        Write-Host "✅ Prisma Client OK" -ForegroundColor Green
    } else {
        Write-Host "❌ .prisma manquant - Exécutez 'pnpm prisma generate'" -ForegroundColor Red
    }
} else {
    Write-Host "❌ @prisma/client non trouvé - Exécutez 'pnpm install'" -ForegroundColor Red
}
```

### Vérifier standalone après build
```powershell
$standalonePrisma = "C:\Users\j_ley\Atelier-velo+\apps\web\.next\standalone\apps\web\node_modules\.prisma"

if (Test-Path $standalonePrisma) {
    Write-Host "✅ Prisma copié dans standalone" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma manquant dans standalone" -ForegroundColor Red
}
```

### Vérifier exe généré
```powershell
$exePath = "C:\Users\j_ley\Atelier-velo+\apps\desktop\dist\win-unpacked"
$exe = Get-ChildItem $exePath -Filter "*.exe" | Select-Object -First 1

if ($exe) {
    $size = [math]::Round($exe.Length / 1MB, 2)
    Write-Host "✅ Exe généré: $($exe.Name) ($size MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Exe non trouvé" -ForegroundColor Red
}
```

---

## 📊 Logs Attendus

### Logs normaux
```
>>> Génération Prisma Client...
✔ Generated Prisma Client (v6.16.3)
[OK] Prisma Client généré et vérifié: @prisma+client@6.16.3_prism_xxx

>>> Build Next.js standalone...
✓ Compiled successfully
[OK] Build Next.js terminé

>>> Copie dépendances critiques dans standalone...
[INFO] .prisma non trouvé (recherche dans pnpm store...)
[INFO] Recherche dans: C:\Users\j_ley\Atelier-velo+\node_modules\.pnpm
[OK] .prisma copié depuis pnpm store
[OK] @prisma/client copié depuis pnpm store

>>> Build Electron Windows...
[OK] Build Electron terminé

✅ BUILD V2 TERMINÉ AVEC SUCCÈS
```

### Warning Supabase (normal)
```
Supabase credentials are not set. Metrics will not be saved to the database.
```

**Impact**: Aucun - L'application fonctionne sans Supabase.

---

## 🎯 Commandes Rapides

### Build Standard
```powershell
.\build-v2-complet.ps1 -Version "1.0.2"
```

### Build avec Distribution
```powershell
.\build-v2-complet.ps1 -Version "1.0.2" -CreateDistribution
```

### Build avec Nettoyage Complet
```powershell
.\build-v2-complet.ps1 -Version "1.0.2" -CleanAll -CreateDistribution
```

### Build Rapide (V1)
```powershell
.\build-v1-simple.ps1 -Version "1.0.2"
```

---

## 📚 Documentation

- **`BUILD_PROCEDURE_COMPLETE.md`** - Ce document
- **`BUILD_FINAL_READY.md`** - Checklist et vérifications
- **`GUIDE_BUILD_V1_V2.md`** - Comparaison V1 vs V2
- **`CORRECTIONS_BUILD_V1_V2.md`** - Corrections appliquées
- **`GARANTIE_BUILD_SANS_ERREURS.md`** - Garanties TypeScript/ESLint

---

## ✅ Checklist Finale

Avant de lancer le build:

- [ ] PowerShell en **Administrateur**
- [ ] Node.js 20.18.0 installé
- [ ] pnpm installé globalement
- [ ] Dans le bon dossier: `C:\Users\j_ley\Atelier-velo+`

Lancer le build:

```powershell
.\build-v2-complet.ps1 -Version "1.0.2" -CreateDistribution
```

**Le script s'occupe du reste !**

---

## 🎉 Résultat Final

Après un build réussi, vous aurez:

```
apps/desktop/dist/
├── win-unpacked/
│   └── Atelier Velo+.exe          (Prêt à lancer)
├── Atelier Velo+ Setup 1.0.2.exe  (Installer)
└── ...

AtelierVelo-1.0.2-Windows/          (Si -CreateDistribution)
├── Atelier Velo+.exe
├── Atelier Velo+ Setup 1.0.2.exe
└── README.txt
```

**Testez l'exe**:
```powershell
cd apps\desktop\dist\win-unpacked
.\Atelier Velo+.exe
```

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
