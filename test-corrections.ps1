# ============================================================================
# TEST RAPIDE DES CORRECTIONS - Build Windows
# ============================================================================
# Date: 22 novembre 2025
# Objectif: Valider corrections avant build complet
# ============================================================================

$ErrorActionPreference = "Stop"

# Couleurs
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Step { Write-Host "`n🔹 $args" -ForegroundColor Yellow }

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TEST CORRECTIONS BUILD WINDOWS - 22 novembre 2025         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================================================
# ÉTAPE 1: VÉRIFICATION FICHIERS CORRIGÉS
# ============================================================================
Write-Step "Vérification fichiers corrigés..."

# 1.1 electron-builder.config.yml
Write-Info "Vérification electron-builder.config.yml..."
$configContent = Get-Content "electron-builder.config.yml" -Raw
if ($configContent -match "mac:[\s\S]*target:[\s\S]*dmg") {
    Write-Error "Configuration macOS encore présente dans electron-builder.config.yml"
    exit 1
} else {
    Write-Success "Configuration macOS supprimée ✓"
}

# 1.2 src/lib/prisma.ts
Write-Info "Vérification src/lib/prisma.ts..."
$prismaContent = Get-Content "src/lib/prisma.ts" -Raw
if ($prismaContent -match "await import") {
    Write-Error "Erreur 'await import' encore présente dans prisma.ts"
    exit 1
} else {
    Write-Success "Erreur 'await import' corrigée ✓"
}

if ($prismaContent -match "require\('module'\)") {
    Write-Success "require('module') synchrone présent ✓"
} else {
    Write-Error "require('module') manquant dans prisma.ts"
    exit 1
}

# ============================================================================
# ÉTAPE 2: VÉRIFICATION ENVIRONNEMENT
# ============================================================================
Write-Step "Vérification environnement..."

# 2.1 Node.js
$nodeVersion = node -v
Write-Info "Node.js: $nodeVersion"
if ($nodeVersion -notmatch "v20\.") {
    Write-Error "Node.js 20.x requis, trouvé: $nodeVersion"
    exit 1
}
Write-Success "Node.js version OK ✓"

# 2.2 Fichiers critiques
$criticalFiles = @(
    ".env.production",
    "prisma/schema.prisma",
    "electron/main.js",
    "next.config.js",
    "package.json"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Success "$file présent ✓"
    } else {
        Write-Error "$file manquant"
        exit 1
    }
}

# ============================================================================
# ÉTAPE 3: TEST BUILD NEXT.JS
# ============================================================================
Write-Step "Test build Next.js..."

Write-Info "Nettoyage .next/..."
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

Write-Info "Exécution: npm run build..."
$env:DATABASE_URL = "file:./data/atelier.db"
$env:NODE_ENV = "production"

try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build Next.js échoué avec code: $LASTEXITCODE"
    }
    Write-Success "Build Next.js réussi ✓"
} catch {
    Write-Error "Build Next.js échoué: $_"
    exit 1
}

# ============================================================================
# ÉTAPE 4: VÉRIFICATION BUILD NEXT.JS
# ============================================================================
Write-Step "Vérification build Next.js..."

$nextPaths = @(
    ".next/server",
    ".next/static",
    ".next/BUILD_ID"
)

foreach ($path in $nextPaths) {
    if (Test-Path $path) {
        Write-Success "$path présent ✓"
    } else {
        Write-Error "$path manquant"
        exit 1
    }
}

# ============================================================================
# ÉTAPE 5: TEST PRÉPARATION ELECTRON
# ============================================================================
Write-Step "Test préparation Electron..."

Write-Info "Nettoyage electron-resources/..."
if (Test-Path "electron-resources") {
    Remove-Item -Recurse -Force "electron-resources"
}

Write-Info "Exécution: npm run postbuild..."
try {
    npm run postbuild
    if ($LASTEXITCODE -ne 0) {
        throw "Préparation Electron échouée avec code: $LASTEXITCODE"
    }
    Write-Success "Préparation Electron réussie ✓"
} catch {
    Write-Error "Préparation Electron échouée: $_"
    exit 1
}

# ============================================================================
# ÉTAPE 6: VÉRIFICATION ELECTRON-RESOURCES
# ============================================================================
Write-Step "Vérification electron-resources/..."

$electronPaths = @(
    "electron-resources/web/.next",
    "electron-resources/web/server.js",
    "electron-resources/web/npm_modules",
    "electron-resources/schema.sql"
)

foreach ($path in $electronPaths) {
    if (Test-Path $path) {
        Write-Success "$path présent ✓"
    } else {
        Write-Error "$path manquant"
        exit 1
    }
}

# Vérifier Prisma dans npm_modules
$prismaPath = "electron-resources/web/npm_modules/@prisma/client"
if (Test-Path $prismaPath) {
    Write-Success "Prisma Client présent dans npm_modules ✓"
} else {
    Write-Error "Prisma Client manquant dans npm_modules"
    exit 1
}

# ============================================================================
# RÉSUMÉ
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ TOUS LES TESTS RÉUSSIS !                               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Success "Corrections validées :"
Write-Success "  • Configuration macOS supprimée"
Write-Success "  • Erreur await corrigée dans prisma.ts"
Write-Success "  • Build Next.js fonctionnel"
Write-Success "  • Préparation Electron fonctionnelle"
Write-Success "  • Tous fichiers critiques présents"

Write-Host "`n🚀 PRÊT POUR BUILD ELECTRON COMPLET !" -ForegroundColor Green
Write-Host "   Commande: .\build-electron-asar.ps1`n" -ForegroundColor Cyan

exit 0

