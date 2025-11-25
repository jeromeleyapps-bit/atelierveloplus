# 🏗️ Build Complet Fonctionnel - Atelier Vélo+
# Script complet: Unpacked + NSIS avec toutes les corrections

# ============================================================================= 
# CONFIGURATION
# =============================================================================
$ErrorActionPreference = "Stop"

Write-Host "🚀 BUILD COMPLET FONCTIONNEL - ATELIER VÉLO+" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# =============================================================================
# ÉTAPE 1: NETTOYAGE COMPLET
# =============================================================================
Write-Host "`n🧹 ÉTAPE 1/7: Nettoyage complet..." -ForegroundColor Yellow

# Arrêter tous les processus
Write-Host "  • Arrêt processus Electron/Node..." -ForegroundColor Gray
taskkill /F /IM "Atelier Velo+.exe" /T -ErrorAction SilentlyContinue
taskkill /F /IM "node.exe" /T -ErrorAction SilentlyContinue

# Nettoyer dossiers
Write-Host "  • Suppression builds précédents..." -ForegroundColor Gray
Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "release" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "electron-resources\web" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Nettoyage terminé" -ForegroundColor Green

# =============================================================================
# ÉTAPE 2: BUILD NEXT.js
# =============================================================================
Write-Host "`n🔨 ÉTAPE 2/7: Build Next.js..." -ForegroundColor Yellow

# Vérifier si build nécessaire
if (Test-Path ".next") {
    Write-Host "  • Build Next.js existant détecté, rebuild forcé..." -ForegroundColor Gray
} else {
    Write-Host "  • Build Next.js production..." -ForegroundColor Gray
}

Write-Host "  • Nettoyage build précédent..." -ForegroundColor Gray
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "  • Lancement build Next.js..." -ForegroundColor Gray
npm run build 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur build Next.js!" -ForegroundColor Red
    Write-Host "Vérifiez les erreurs ci-dessus et corrigez avant de continuer." -ForegroundColor Yellow
    exit 1
}

# Vérifier que le build a créé les fichiers critiques
if (-not (Test-Path ".next\server")) {
    Write-Host "❌ .next/server non créé après build!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build Next.js terminé avec succès" -ForegroundColor Green

# =============================================================================
# ÉTAPE 3: PRÉPARATION RESSOURCES
# =============================================================================
Write-Host "`n📦 ÉTAPE 3/7: Préparation ressources Electron..." -ForegroundColor Yellow

Write-Host "  • Exécution prepare-build-optimized.js..." -ForegroundColor Gray
node prepare-build-optimized.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur préparation ressources!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Ressources préparées" -ForegroundColor Green

# =============================================================================
# ÉTAPE 4: VÉRIFICATION STRUCTURE CRITIQUE + COPIE FICHIERS
# =============================================================================
Write-Host "`n🔍 ÉTAPE 4/7: Vérification structure + copie fichiers critiques..." -ForegroundColor Yellow

# Vérifier .next/server
if (Test-Path "electron-resources\web\.next\server") {
    $serverCount = (Get-ChildItem "electron-resources\web\.next\server" -Recurse).Count
    Write-Host "  • .next/server: $serverCount fichiers ✅" -ForegroundColor $(if($serverCount -gt 300){"Green"}else{"Red"})
} else {
    Write-Host "❌ .next/server MANQUANT! Copie depuis .next/..." -ForegroundColor Red
    if (Test-Path ".next\server") {
        Write-Host "  • Copie .next/server vers resources..." -ForegroundColor Gray
        Copy-Item -Path ".next\server" -Destination "electron-resources\web\.next\" -Recurse -Force
        $serverCount = (Get-ChildItem "electron-resources\web\.next\server" -Recurse).Count
        Write-Host "  ✅ .next/server copié: $serverCount fichiers" -ForegroundColor Green
    } else {
        Write-Host "❌ .next/server introuvable!" -ForegroundColor Red
        exit 1
    }
}

# Vérifier .next/static
if (Test-Path "electron-resources\web\.next\static") {
    $staticCount = (Get-ChildItem "electron-resources\web\.next\static" -Recurse).Count
    Write-Host "  • .next/static: $staticCount fichiers ✅" -ForegroundColor Green
} else {
    Write-Host "⚠️ .next/static MANQUANT! Copie depuis .next/..." -ForegroundColor Yellow
    if (Test-Path ".next\static") {
        Write-Host "  • Copie .next/static vers resources..." -ForegroundColor Gray
        Copy-Item -Path ".next\static" -Destination "electron-resources\web\.next\" -Recurse -Force
        $staticCount = (Get-ChildItem "electron-resources\web\.next\static" -Recurse).Count
        Write-Host "  ✅ .next/static copié: $staticCount fichiers" -ForegroundColor Green
    }
}

# Vérifier node_modules Next.js
if (Test-Path "electron-resources\web\npm_modules\next\dist\server\next.js") {
    Write-Host "  • Next.js server: présent ✅" -ForegroundColor Green
} else {
    Write-Host "❌ Next.js server MANQUANT! Copie complète node_modules..." -ForegroundColor Red
    Write-Host "  • Copie node_modules complet vers resources..." -ForegroundColor Gray
    Copy-Item -Path "node_modules" -Destination "electron-resources\web\npm_modules\" -Recurse -Force
    if (Test-Path "electron-resources\web\npm_modules\next\dist\server\next.js") {
        Write-Host "  ✅ Next.js server copié" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec copie Next.js server!" -ForegroundColor Red
        exit 1
    }
}

# Vérifier modules critiques pour éviter l'écran noir
$criticalModules = @(
    "next\dist\server\next.js",
    "react\index.js", 
    "react-dom\index.js",
    "watchpack\lib\watchpack.js",
    "graceful-fs\graceful-fs.js",
    "glob-to-regexp\index.js"
)

Write-Host "  • Vérification modules critiques..." -ForegroundColor Gray
$missingModules = @()
foreach ($module in $criticalModules) {
    $modulePath = "electron-resources\web\npm_modules\$module"
    if (Test-Path $modulePath) {
        Write-Host "    ✅ $module" -ForegroundColor Green
    } else {
        Write-Host "    ❌ $module MANQUANT!" -ForegroundColor Red
        $missingModules += $module
    }
}

if ($missingModules.Count -gt 0) {
    Write-Host "  • Recopie node_modules complet (modules manquants)..." -ForegroundColor Yellow
    Copy-Item -Path "node_modules" -Destination "electron-resources\web\npm_modules\" -Recurse -Force
    Write-Host "  ✅ node_modules complet recopié" -ForegroundColor Green
}

# Vérifier icône
if (Test-Path "resources\icon.ico") {
    Write-Host "  • Icône: présente ✅" -ForegroundColor Green
} else {
    Write-Host "❌ Icône MANQUANTE!" -ForegroundColor Red
    exit 1
}

# Vérifier server.js
if (Test-Path "electron-resources\web\server.js") {
    Write-Host "  • server.js: présent ✅" -ForegroundColor Green
} else {
    Write-Host "❌ server.js MANQUANT!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Structure validée et fichiers critiques copiés" -ForegroundColor Green

# =============================================================================
# ÉTAPE 5: BUILD UNPACKED
# =============================================================================
Write-Host "`n📁 ÉTAPE 5/7: Build version Unpacked..." -ForegroundColor Yellow

# Configuration temporaire pour unpacked
$configUnpacked = @"
appId: com.atelier.velo-plus
productName: Atelier Vélo+
directories:
  output: dist-electron-unpacked
files:
  - electron/**/*
  - package.json
  - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
  - "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
  - "!**/node_modules/*.d.ts"
  - "!**/node_modules/.bin"
  - "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}"
  - "!.editorconfig"
  - "!**/._*"
  - "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}"
  - "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}"
  - "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
extraResources:
  - from: electron-resources/web
    to: web
    filter: ["**/*", "!node_modules"]
  # Copie EXPLICITE .next/ (bug electron-builder)
  - from: electron-resources/web/.next
    to: web/.next
  - from: electron-resources/web/node_modules
    to: web/node_modules
win:
  target:
    - target: dir  # Unpacked seulement
      arch:
        - x64
  forceCodeSigning: false
  icon: resources/icon.ico
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}"
"@

$configUnpacked | Out-File -FilePath "electron-builder-unpacked.yml" -Encoding UTF8

Write-Host "  • Build Unpacked en cours..." -ForegroundColor Gray
npx electron-builder --config electron-builder-unpacked.yml

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur build Unpacked!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build Unpacked terminé" -ForegroundColor Green

# =============================================================================
# ÉTAPE 6: CORRECTION DÉPENDANCES UNPACKED + VALIDATION ÉCRAN NOIR
# =============================================================================
Write-Host "`n🔧 ÉTAPE 6/7: Correction dépendances + validation écran noir..." -ForegroundColor Yellow

Write-Host "  • Copie node_modules complet (évite écran noir)..." -ForegroundColor Gray
Copy-Item -Path "node_modules" -Destination "dist-electron-unpacked\win-unpacked\resources\web\npm_modules" -Recurse -Force

Write-Host "  • Copie icône manuelle..." -ForegroundColor Gray
Copy-Item -Path "resources\icon.ico" -Destination "dist-electron-unpacked\win-unpacked\resources\" -Force

# VALIDATION CRITIQUE: Vérifier fichiers qui causent l'écran noir
Write-Host "`n  🔍 Validation fichiers critiques (écran noir)..." -ForegroundColor Yellow

$criticalFiles = @(
    "dist-electron-unpacked\win-unpacked\resources\web\.next\server\pages\_app.js",
    "dist-electron-unpacked\win-unpacked\resources\web\.next\server\pages\_document.js", 
    "dist-electron-unpacked\win-unpacked\resources\web\npm_modules\next\dist\server\next.js",
    "dist-electron-unpacked\win-unpacked\resources\web\npm_modules\react\index.js",
    "dist-electron-unpacked\win-unpacked\resources\web\npm_modules\react-dom\index.js"
)

$missingFiles = @()
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $size = [math]::Round((Get-Item $file).Length/1KB,2)
        Write-Host "    ✅ $(Split-Path $file -Leaf) - $size KB" -ForegroundColor Green
    } else {
        Write-Host "    ❌ $(Split-Path $file -Leaf) MANQUANT!" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "  ⚠️ Fichiers manquants détectés - Recopie forcée..." -ForegroundColor Yellow
    foreach ($missingFile in $missingFiles) {
        $sourceFile = $missingFile -replace "dist-electron-unpacked\\win-unpacked\\resources\\web\\", ""
        if ($sourceFile -match "^\.next\\") {
            $sourceFile = $sourceFile -replace "^\.next\\", ".next\\"
            if (Test-Path $sourceFile) {
                $targetFile = $missingFile
                $targetDir = Split-Path $targetFile -Parent
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                Copy-Item -Path $sourceFile -Destination $targetFile -Force
                Write-Host "    ✅ Copié: $(Split-Path $missingFile -Leaf)" -ForegroundColor Green
            }
        }
    }
    
    # Si encore des manquants, recopier tout .next
    $stillMissing = $missingFiles | Where-Object { -not (Test-Path $_) }
    if ($stillMissing.Count -gt 0) {
        Write-Host "  🔄 Recopie complète .next vers build..." -ForegroundColor Yellow
        Copy-Item -Path ".next" -Destination "dist-electron-unpacked\win-unpacked\resources\web\" -Recurse -Force
    }
}

Write-Host "✅ Corrections Unpacked + validation écran noir appliquées" -ForegroundColor Green

# =============================================================================
# ÉTAPE 7: BUILD NSIS INSTALLATEUR
# =============================================================================
Write-Host "`n📦 ÉTAPE 7/7: Build Installateur NSIS..." -ForegroundColor Yellow

Write-Host "  • Build NSIS en cours..." -ForegroundColor Gray
npx electron-builder --win nsis --config electron-builder.config.yml

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur build NSIS!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build NSIS terminé" -ForegroundColor Green

# =============================================================================
# ORGANISATION FINALE
# =============================================================================
Write-Host "`n📂 ORGANISATION FINALE..." -ForegroundColor Cyan

# Créer dossier release
New-Item -ItemType Directory -Path "C:\atelier\release" -Force | Out-Null

# Copier Unpacked
if (Test-Path "dist-electron-unpacked\win-unpacked") {
    Write-Host "  • Copie version Unpacked..." -ForegroundColor Gray
    Copy-Item -Path "dist-electron-unpacked\win-unpacked\*" -Destination "C:\atelier\release\unpacked\" -Recurse -Force
}

# Copier Installateur
$installer = Get-ChildItem "dist-electron" -Filter "*.exe" -Recurse
if ($installer) {
    Write-Host "  • Copie Installateur NSIS..." -ForegroundColor Gray
    Copy-Item -Path $installer.FullName -Destination "C:\atelier\release\"
}

Write-Host "✅ Organisation terminée" -ForegroundColor Green

# =============================================================================
# VALIDATION FINALE
# =============================================================================
Write-Host "`n🎯 VALIDATION FINALE..." -ForegroundColor Cyan

Write-Host "`n📁 Contenu dossier release:" -ForegroundColor Yellow
Get-ChildItem "C:\atelier\release" -Recurse | ForEach-Object {
    if ($_.PSIsContainer) {
        Write-Host "  📂 $($_.Name)" -ForegroundColor Gray
    } else {
        $size = [math]::Round($_.Length/1MB,2)
        Write-Host "  📄 $($_.Name) - $size MB" -ForegroundColor Green
    }
}

# Vérification structure Unpacked
Write-Host "`n🔍 Vérification structure Unpacked:" -ForegroundColor Yellow
if (Test-Path "C:\atelier\release\unpacked\resources\web\.next\server") {
    $serverCount = (Get-ChildItem "C:\atelier\release\unpacked\resources\web\.next\server" -Recurse).Count
    Write-Host "  ✅ .next/server: $serverCount fichiers" -ForegroundColor $(if($serverCount -gt 300){"Green"}else{"Red"})
}

if (Test-Path "C:\atelier\release\unpacked\resources\web\npm_modules\next\dist\server\next.js") {
    Write-Host "  ✅ Next.js server: présent" -ForegroundColor Green
}

Write-Host "`n🎉 BUILD COMPLET TERMINÉ AVEC SUCCÈS!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "📂 Dossier release: C:\atelier\release" -ForegroundColor Cyan
Write-Host "🚀 Version Unpacked: C:\atelier\release\unpacked\" -ForegroundColor Cyan
Write-Host "📦 Installateur NSIS: C:\atelier\release\Atelier Velo+.exe" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Green

Write-Host "`n⚡ Test rapide:" -ForegroundColor Yellow
Write-Host "Start-Process 'C:\atelier\release\unpacked\Atelier Velo+.exe'" -ForegroundColor Gray
