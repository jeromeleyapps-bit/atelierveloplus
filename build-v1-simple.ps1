###############################################################################
# Build V1 - Simple & Rapide
# Atelier Vélo+ - Build Electron Windows
# 
# Copyright © 2024-2025 Jérôme Leyssard - Upgraded Bikes
# Tous droits réservés.
#
# USAGE:
#   .\build-v1-simple.ps1
#   .\build-v1-simple.ps1 -SkipClean
#   .\build-v1-simple.ps1 -Version "1.0.2"
#
# PREREQUIS:
#   - PowerShell en Administrateur (pour symlinks)
#   - Node.js 20.18.0
#   - pnpm installé globalement
###############################################################################

param(
    [string]$Version = "1.0.0",
    [switch]$SkipClean,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

# Couleurs et helpers
function Write-Step    { param([string]$msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Success { param([string]$msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info    { param([string]$msg) Write-Host "[INFO] $msg" -ForegroundColor Yellow }
function Write-Error   { param([string]$msg) Write-Host "[ERREUR] $msg" -ForegroundColor Red }

# Chemins
$ROOT = "C:\Users\j_ley\Atelier-velo+"
$WEB_DIR = Join-Path $ROOT "apps\web"
$DESKTOP_DIR = Join-Path $ROOT "apps\desktop"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BUILD V1 - SIMPLE & RAPIDE" -ForegroundColor Green
Write-Host "  Atelier Vélo+ v$Version" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

try {
    # 1. Vérification Node.js
    Write-Step "Vérification Node.js..."
    $nodeVersion = node -v
    Write-Host "  Version Node: $nodeVersion"
    if ($nodeVersion -notmatch "v20\.") {
        Write-Error "Node.js 20.x requis. Actuel: $nodeVersion"
        exit 1
    }
    Write-Success "Node.js OK"

    # 2. Arrêt processus
    Write-Step "Arrêt processus en cours..."
    Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" -or $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Success "Processus arrêtés"

    # 3. Nettoyage (optionnel)
    if (-not $SkipClean) {
        Write-Step "Nettoyage..."
        Set-Location $WEB_DIR
        Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Nettoyage terminé"
    }

    # 4. Installation dépendances
    Write-Step "Installation dépendances..."
    Set-Location $ROOT
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "Installation dépendances échouée" }
    Write-Success "Dépendances installées"

    # 5. Prisma
    Write-Step "Génération Prisma Client..."
    Set-Location $WEB_DIR
    pnpm prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma generate échoué" }
    
    # Vérifier que .prisma existe dans pnpm store
    $pnpmLocations = @(
        (Join-Path $WEB_DIR "node_modules\.pnpm"),
        (Join-Path $ROOT "node_modules\.pnpm")
    )
    
    $prismaVerified = $false
    foreach ($pnpmRoot in $pnpmLocations) {
        if (Test-Path $pnpmRoot) {
            $pnpmPrismaClient = Get-ChildItem $pnpmRoot -Filter "@prisma+client@*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($pnpmPrismaClient) {
                $pnpmPrismaPath = Join-Path $pnpmPrismaClient.FullName "node_modules\.prisma\client"
                if (Test-Path $pnpmPrismaPath) {
                    Write-Success "Prisma Client généré et vérifié"
                    $prismaVerified = $true
                    break
                }
            }
        }
    }
    
    if (-not $prismaVerified) {
        Write-Info "Prisma Client non vérifié dans pnpm store (peut être normal)"
    }

    # 6. Build Next.js
    Write-Step "Build Next.js standalone..."
    $env:DATABASE_URL = "file:./data/atelier.db"
    $env:NODE_ENV = "production"
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Build Next.js échoué" }
    Write-Success "Build Next.js terminé"

    # 7. Vérification standalone
    Write-Step "Vérification standalone..."
    $standaloneServer = Join-Path $WEB_DIR ".next\standalone\apps\web\server.js"
    if (-not (Test-Path $standaloneServer)) {
        throw "Fichier standalone manquant: $standaloneServer"
    }
    Write-Success "Standalone OK"

    # 8. Copie Prisma Client dans standalone (CRITIQUE)
    Write-Step "Copie Prisma Client dans standalone..."
    $standaloneDest = Join-Path $WEB_DIR ".next\standalone\apps\web\node_modules"
    
    # Copier .prisma
    $prismaSource = Join-Path $WEB_DIR "node_modules\.prisma"
    if (Test-Path $prismaSource) {
        $prismaDest = Join-Path $standaloneDest ".prisma"
        if (Test-Path $prismaDest) {
            Remove-Item $prismaDest -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Directory -Path $prismaDest -Force | Out-Null
        Copy-Item "$prismaSource\*" -Destination $prismaDest -Recurse -Force
        Write-Success ".prisma copié"
    } else {
        # Chercher dans pnpm store (web puis root)
        $pnpmLocations = @(
            (Join-Path $WEB_DIR "node_modules\.pnpm"),
            (Join-Path $ROOT "node_modules\.pnpm")
        )
        
        $prismaFound = $false
        foreach ($pnpmRoot in $pnpmLocations) {
            if (Test-Path $pnpmRoot) {
                $pnpmPrismaClient = Get-ChildItem $pnpmRoot -Filter "@prisma+client@*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($pnpmPrismaClient) {
                    $pnpmPrismaPath = Join-Path $pnpmPrismaClient.FullName "node_modules\.prisma"
                    if (Test-Path $pnpmPrismaPath) {
                        $prismaDest = Join-Path $standaloneDest ".prisma"
                        if (Test-Path $prismaDest) {
                            Remove-Item $prismaDest -Recurse -Force -ErrorAction SilentlyContinue
                        }
                        Copy-Item $pnpmPrismaPath -Destination $prismaDest -Recurse -Force
                        Write-Success ".prisma copié depuis pnpm store"
                        $prismaFound = $true
                        break
                    }
                }
            }
        }
        
        if (-not $prismaFound) {
            Write-Info ".prisma non trouvé - Le build peut échouer"
        }
    }

    # Copier @prisma/client
    $prismaClientSource = Join-Path $WEB_DIR "node_modules\@prisma\client"
    if (Test-Path $prismaClientSource) {
        $prismaClientDest = Join-Path $standaloneDest "@prisma\client"
        if (Test-Path $prismaClientDest) {
            Remove-Item $prismaClientDest -Recurse -Force -ErrorAction SilentlyContinue
        }
        $prismaDir = Split-Path $prismaClientDest
        if (-not (Test-Path $prismaDir)) {
            New-Item -ItemType Directory -Path $prismaDir -Force | Out-Null
        }
        Copy-Item $prismaClientSource -Destination $prismaClientDest -Recurse -Force
        Write-Success "@prisma/client copié"
    } else {
        # Chercher dans pnpm store (web puis root)
        $pnpmLocations = @(
            (Join-Path $WEB_DIR "node_modules\.pnpm"),
            (Join-Path $ROOT "node_modules\.pnpm")
        )
        
        $clientFound = $false
        foreach ($pnpmRoot in $pnpmLocations) {
            if (Test-Path $pnpmRoot) {
                $pnpmPrismaClient = Get-ChildItem $pnpmRoot -Filter "@prisma+client@*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($pnpmPrismaClient) {
                    $pnpmClientPath = Join-Path $pnpmPrismaClient.FullName "node_modules\@prisma\client"
                    if (Test-Path $pnpmClientPath) {
                        $prismaClientDest = Join-Path $standaloneDest "@prisma\client"
                        if (Test-Path $prismaClientDest) {
                            Remove-Item $prismaClientDest -Recurse -Force -ErrorAction SilentlyContinue
                        }
                        $prismaDir = Split-Path $prismaClientDest
                        if (-not (Test-Path $prismaDir)) {
                            New-Item -ItemType Directory -Path $prismaDir -Force | Out-Null
                        }
                        Copy-Item $pnpmClientPath -Destination $prismaClientDest -Recurse -Force
                        Write-Success "@prisma/client copié depuis pnpm store"
                        $clientFound = $true
                        break
                    }
                }
            }
        }
        
        if (-not $clientFound) {
            Write-Info "@prisma/client non trouvé (peut être normal)"
        }
    }

    # 9. Build Electron
    Write-Step "Build Electron Windows..."
    Set-Location $DESKTOP_DIR
    
    # Mise à jour version dans package.json
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
    
    npm run build:win
    if ($LASTEXITCODE -ne 0) { throw "Build Electron échoué" }
    Write-Success "Build Electron terminé"

    # 10. Vérification exe
    Write-Step "Vérification exécutable..."
    $exePath = Get-ChildItem "dist\win-unpacked" -Filter "*.exe" | Select-Object -First 1
    if (-not $exePath) {
        throw "Exécutable non trouvé dans dist\win-unpacked"
    }
    Write-Success "Exécutable: $($exePath.Name)"

    # 11. Copie Prisma dans ressources packagées
    Write-Step "Copie Prisma dans ressources..."
    $resourcesWeb = Join-Path $DESKTOP_DIR "dist\win-unpacked\resources\web"
    if (Test-Path $resourcesWeb) {
        $prismaDir = Join-Path $WEB_DIR "prisma"
        if (Test-Path $prismaDir) {
            Copy-Item $prismaDir -Destination $resourcesWeb -Recurse -Force
            Write-Success "Prisma copié dans ressources"
        }
    }

    # Résumé
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  BUILD V1 TERMINÉ AVEC SUCCÈS" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Version:     $Version" -ForegroundColor White
    Write-Host "Exécutable:  $($exePath.FullName)" -ForegroundColor White
    Write-Host "Installer:   $DESKTOP_DIR\dist\Atelier Velo+ Setup $Version.exe" -ForegroundColor White
    Write-Host ""
    Write-Host "Pour lancer:" -ForegroundColor Cyan
    Write-Host "  cd $DESKTOP_DIR\dist\win-unpacked" -ForegroundColor Gray
    Write-Host "  .\`"$($exePath.Name)`"" -ForegroundColor Gray

} catch {
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  BUILD V1 ÉCHOUÉ" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Error $_.Exception.Message
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}
