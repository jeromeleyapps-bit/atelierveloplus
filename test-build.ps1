# Test Build - Version Ultra Simple
# Date: 22 novembre 2025

$ErrorActionPreference = "Stop"

Write-Host "`n=== TEST BUILD WINDOWS ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Verifier Node.js
Write-Host "1. Verification Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green

# Test 2: Verifier fichiers critiques
Write-Host "`n2. Verification fichiers..." -ForegroundColor Yellow
$files = @(".env.production", "prisma/schema.prisma", "electron/main.js")
foreach ($f in $files) {
    if (Test-Path $f) {
        Write-Host "   OK: $f" -ForegroundColor Green
    } else {
        Write-Host "   ERREUR: $f manquant" -ForegroundColor Red
        exit 1
    }
}

# Test 3: Verifier corrections
Write-Host "`n3. Verification corrections..." -ForegroundColor Yellow
$config = Get-Content "electron-builder.config.yml" -Raw
if ($config -like "*mac:*") {
    Write-Host "   ATTENTION: Config macOS presente" -ForegroundColor Red
} else {
    Write-Host "   OK: Config macOS supprimee" -ForegroundColor Green
}

$prisma = Get-Content "src/lib/prisma.ts" -Raw
if ($prisma -like "*await import*") {
    Write-Host "   ERREUR: await import present" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   OK: await import corrige" -ForegroundColor Green
}

# Test 4: Build Next.js
Write-Host "`n4. Build Next.js..." -ForegroundColor Yellow
$env:DATABASE_URL = "file:./data/atelier.db"
$env:NODE_ENV = "production"

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERREUR: Build Next.js echoue" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Build Next.js reussi" -ForegroundColor Green

# Test 5: Preparation Electron
Write-Host "`n5. Preparation Electron..." -ForegroundColor Yellow
if (Test-Path "electron-resources") {
    Remove-Item -Recurse -Force "electron-resources" -ErrorAction SilentlyContinue
}

npm run postbuild
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERREUR: Preparation Electron echouee" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Preparation Electron reussie" -ForegroundColor Green

# Test 6: Verification finale
Write-Host "`n6. Verification finale..." -ForegroundColor Yellow
$paths = @("electron-resources/web/.next", "electron-resources/web/server.js", "electron-resources/schema.sql")
foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "   OK: $p" -ForegroundColor Green
    } else {
        Write-Host "   ERREUR: $p manquant" -ForegroundColor Red
        exit 1
    }
}

# Succes
Write-Host "`n=== TOUS LES TESTS REUSSIS ===" -ForegroundColor Green
Write-Host "`nPret pour build complet:" -ForegroundColor Cyan
Write-Host ".\build-electron-asar.ps1" -ForegroundColor White
Write-Host ""

exit 0

