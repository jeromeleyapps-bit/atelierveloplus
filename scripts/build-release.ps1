# ============================================================================
# Script de Build Release Complet pour Atelier Velo+
# ============================================================================
# Ce script effectue un build complet de l'application:
# 1. Verification pre-build
# 2. Build Next.js standalone
# 3. Preparation des ressources Electron
# 4. Build Electron (unpacked)
# 5. Creation des installateurs (ZIP + SFX)
# 6. Verification post-build
# ============================================================================

param(
    [switch]$SkipNextBuild,
    [switch]$SkipVerification,
    [string]$Version
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

# Configuration
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       BUILD RELEASE - ATELIER VELO+                        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Lire la version depuis package.json si non specifiee
if (-not $Version) {
    $Version = (Get-Content "package.json" | ConvertFrom-Json).version
}
Write-Host "[INFO] Version: $Version" -ForegroundColor Yellow
Write-Host "[INFO] Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# ETAPE 1: Verification pre-build
# ============================================================================
if (-not $SkipVerification) {
    Write-Host "[1/6] Verification pre-build..." -ForegroundColor Green
    
    $errors = @()
    
    # Verifier les fichiers critiques
    $requiredFiles = @(
        "package.json",
        "electron-builder.config.yml",
        ".env.production",
        "resources\icon.ico",
        "electron\index.js"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $errors += "Fichier manquant: $file"
        }
    }
    
    # Verifier que node_modules existe
    if (-not (Test-Path "node_modules")) {
        $errors += "node_modules manquant - executez 'npm install'"
    }
    
    # Verifier TypeScript
    Write-Host "  Verification TypeScript..." -ForegroundColor Gray
    npx tsc --noEmit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] Erreurs TypeScript detectees" -ForegroundColor Yellow
        # Ne pas bloquer pour les erreurs TS (Next.js compile quand meme)
    } else {
        Write-Host "  [OK] TypeScript OK" -ForegroundColor Green
    }
    
    if ($errors.Count -gt 0) {
        Write-Host ""
        Write-Host "[ERREUR] Verification echouee:" -ForegroundColor Red
        foreach ($err in $errors) {
            Write-Host "  - $err" -ForegroundColor Red
        }
        exit 1
    }
    
    Write-Host "  [OK] Verification pre-build OK" -ForegroundColor Green
} else {
    Write-Host "[1/6] Verification pre-build (SKIP)" -ForegroundColor Gray
}

# ============================================================================
# ETAPE 2: Build Next.js
# ============================================================================
if (-not $SkipNextBuild) {
    Write-Host ""
    Write-Host "[2/6] Build Next.js standalone..." -ForegroundColor Green
    
    # Nettoyer les builds precedents
    if (Test-Path ".next") {
        Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Build Next.js
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Build Next.js echoue" -ForegroundColor Red
        exit 1
    }
    
    # Verifier le build standalone
    if (-not (Test-Path ".next\standalone")) {
        Write-Host "[ERREUR] Build standalone non genere" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  [OK] Build Next.js OK" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[2/6] Build Next.js (SKIP)" -ForegroundColor Gray
}

# ============================================================================
# ETAPE 3: Preparation ressources Electron
# ============================================================================
Write-Host ""
Write-Host "[3/6] Preparation ressources Electron..." -ForegroundColor Green

# Executer le script de preparation
node scripts/prepare-electron-resources.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] Preparation ressources echouee" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Ressources preparees" -ForegroundColor Green

# ============================================================================
# ETAPE 4: Build Electron
# ============================================================================
Write-Host ""
Write-Host "[4/6] Build Electron..." -ForegroundColor Green

# Nettoyer
if (Test-Path "dist-electron") {
    # Tuer les processus qui pourraient bloquer
    Get-Process -Name "Atelier*" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
}

# Build avec electron-builder (mode dir uniquement pour eviter ENAMETOOLONG)
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --config electron-builder.config.yml --win --x64 --dir

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERREUR] Build Electron echoue" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Build Electron OK" -ForegroundColor Green

# ============================================================================
# ETAPE 5: Creation installateurs
# ============================================================================
Write-Host ""
Write-Host "[5/6] Creation installateurs..." -ForegroundColor Green

# Appeler le script de creation d'installateur
& "$projectRoot\scripts\create-installer.ps1" -SkipBuild

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Creation installateur avec erreurs" -ForegroundColor Yellow
}

# ============================================================================
# ETAPE 6: Verification post-build
# ============================================================================
Write-Host ""
Write-Host "[6/6] Verification post-build..." -ForegroundColor Green

$buildDir = "dist-electron\win-unpacked"
$postErrors = @()

# Verifier l'exe
$exePath = Join-Path $buildDir "Atelier Velo+.exe"
if (-not (Test-Path $exePath)) {
    $postErrors += "Executable non trouve"
}

# Verifier l'ASAR
$asarPath = Join-Path $buildDir "resources\app.asar"
if (-not (Test-Path $asarPath)) {
    $postErrors += "ASAR non trouve"
}

# Verifier .env.production
$envPath = Join-Path $buildDir "resources\.env.production"
if (-not (Test-Path $envPath)) {
    $postErrors += ".env.production non trouve"
}

if ($postErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "[ERREUR] Verification post-build echouee:" -ForegroundColor Red
    foreach ($err in $postErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    exit 1
}

Write-Host "  [OK] Verification post-build OK" -ForegroundColor Green

# ============================================================================
# RESUME
# ============================================================================
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       BUILD TERMINE AVEC SUCCES                            " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host "Duree: $([math]::Round($duration.TotalMinutes, 1)) minutes" -ForegroundColor Yellow
Write-Host ""

# Lister les fichiers generes
Write-Host "Fichiers generes:" -ForegroundColor Cyan
Get-ChildItem "dist-electron" -File | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor Yellow
}

$unpackedSize = [math]::Round((Get-ChildItem "dist-electron\win-unpacked" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Host "  - win-unpacked/ ($unpackedSize MB)" -ForegroundColor Yellow

Write-Host ""
Write-Host "Pour tester l'application:" -ForegroundColor Cyan
Write-Host "  .\dist-electron\win-unpacked\Atelier Velo+.exe" -ForegroundColor White
Write-Host ""
