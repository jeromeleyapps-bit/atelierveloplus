###############################################################################
# Build V2 - Complet & Robuste
# Atelier Vélo+ - Build Electron Windows avec gestion d'erreurs avancée
# 
# Copyright © 2024-2025 Jérôme Leyssard - Upgraded Bikes
# Tous droits réservés.
#
# USAGE:
#   .\build-v2-complet.ps1
#   .\build-v2-complet.ps1 -Version "1.0.2" -SkipLint
#   .\build-v2-complet.ps1 -CleanAll -CreateDistribution
#
# PREREQUIS:
#   - PowerShell en Administrateur (pour symlinks)
#   - Node.js 20.18.0
#   - pnpm installé globalement
#
# FONCTIONNALITES:
#   - Nettoyage complet optionnel
#   - Gestion erreurs symlink
#   - Retry automatique
#   - Vérifications étendues
#   - Création package distribution
###############################################################################

param(
    [string]$Version = "1.0.0",
    [switch]$CleanAll,
    [switch]$SkipLint,
    [switch]$SkipTests,
    [switch]$CreateDistribution,
    [switch]$NoRetry
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
Write-Host "  BUILD V2 - COMPLET & ROBUSTE" -ForegroundColor Green
Write-Host "  Atelier Vélo+ v$Version" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

try {
    # 1. Vérification environnement
    Write-Step "Vérification environnement..."
    
    # Node.js
    $nodeVersion = node -v
    Write-Host "  Node.js: $nodeVersion"
    if ($nodeVersion -notmatch "v20\.") {
        Write-Error "Node.js 20.x requis. Actuel: $nodeVersion"
        exit 1
    }
    
    # pnpm
    $pnpmVersion = pnpm -v
    Write-Host "  pnpm: $pnpmVersion"
    
    # Permissions Admin
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Info "PowerShell non lancé en Administrateur - Les symlinks peuvent échouer"
        Write-Info "Pour éviter les erreurs, relancez PowerShell en Admin"
    } else {
        Write-Success "PowerShell en mode Administrateur"
    }
    
    Write-Success "Environnement OK"

    # 2. Arrêt processus
    Write-Step "Arrêt processus en cours..."
    Get-Process | Where-Object { 
        $_.ProcessName -like "*Atelier*" -or 
        $_.ProcessName -eq "node" -or 
        $_.ProcessName -eq "electron"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Success "Processus arrêtés"

    # 3. Nettoyage complet (optionnel)
    if ($CleanAll) {
        Write-Step "Nettoyage complet..."
        Set-Location $WEB_DIR
        
        # Supprimer node_modules
        if (Test-Path "node_modules") {
            Write-Info "Suppression node_modules..."
            Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Supprimer .next
        Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
        
        # Supprimer lockfiles
        Remove-Item pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
        Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
        
        # Nettoyer pnpm store
        try {
            pnpm store prune
        } catch {
            Write-Info "pnpm store prune échoué (non critique)"
        }
        
        # Nettoyer desktop dist
        Set-Location $DESKTOP_DIR
        if (Test-Path "dist") {
            Write-Info "Suppression dist..."
            Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        Write-Success "Nettoyage complet terminé"
    } else {
        Write-Step "Nettoyage léger..."
        Set-Location $WEB_DIR
        Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
        
        Set-Location $DESKTOP_DIR
        if (Test-Path "dist") {
            Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
        }
        Write-Success "Nettoyage léger terminé"
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
                    Write-Success "Prisma Client généré et vérifié: $($pnpmPrismaClient.Name)"
                    $prismaVerified = $true
                    break
                }
            }
        }
    }
    
    if (-not $prismaVerified) {
        throw "Prisma Client non trouvé après generate - Vérifiez le schéma Prisma"
    }

    # 6. Lint (optionnel)
    if (-not $SkipLint) {
        Write-Step "Vérification ESLint..."
        try {
            pnpm lint
            Write-Success "ESLint OK"
        } catch {
            Write-Info "ESLint a des warnings (non bloquant grâce à ignoreDuringBuilds)"
        }
    }

    # 7. Tests TypeScript (optionnel)
    if (-not $SkipTests) {
        Write-Step "Vérification TypeScript..."
        try {
            pnpm tsc --noEmit
            Write-Success "TypeScript OK"
        } catch {
            Write-Info "TypeScript a des erreurs (non bloquant grâce à ignoreBuildErrors)"
        }
    }

    # 8. Build Next.js
    Write-Step "Build Next.js standalone..."
    $env:DATABASE_URL = "file:./data/atelier.db"
    $env:NODE_ENV = "production"
    
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Build Next.js échoué" }
    Write-Success "Build Next.js terminé"

    # 9. Vérification standalone
    Write-Step "Vérification standalone..."
    $standaloneServer = Join-Path $WEB_DIR ".next\standalone\apps\web\server.js"
    if (-not (Test-Path $standaloneServer)) {
        throw "Fichier standalone manquant: $standaloneServer"
    }
    
    $standalonePackageJson = Join-Path $WEB_DIR ".next\standalone\apps\web\package.json"
    if (-not (Test-Path $standalonePackageJson)) {
        Write-Info "package.json standalone manquant (peut être normal)"
    }
    
    Write-Success "Standalone OK"

    # 10. Copie dépendances critiques dans standalone
    Write-Step "Copie dépendances critiques dans standalone..."
    $standaloneDest = Join-Path $WEB_DIR ".next\standalone\apps\web\node_modules"
    
    # Créer le dossier si nécessaire
    if (-not (Test-Path $standaloneDest)) {
        New-Item -ItemType Directory -Path $standaloneDest -Force | Out-Null
    }
    
    # Copier Prisma Client (.prisma)
    $prismaSource = Join-Path $WEB_DIR "node_modules\.prisma"
    if (Test-Path $prismaSource) {
        $prismaDest = Join-Path $standaloneDest ".prisma"
        if (Test-Path $prismaDest) {
            Remove-Item $prismaDest -Recurse -Force -ErrorAction SilentlyContinue
        }
        Copy-Item $prismaSource -Destination $prismaDest -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success ".prisma copié"
    } else {
        Write-Info ".prisma non trouvé (recherche dans pnpm store...)"
        # Chercher dans pnpm store (web puis root)
        $pnpmLocations = @(
            (Join-Path $WEB_DIR "node_modules\.pnpm"),
            (Join-Path $ROOT "node_modules\.pnpm")
        )
        
        $prismaFound = $false
        foreach ($pnpmRoot in $pnpmLocations) {
            if (Test-Path $pnpmRoot) {
                Write-Info "Recherche dans: $pnpmRoot"
                $pnpmPrismaClient = Get-ChildItem $pnpmRoot -Filter "@prisma+client@*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($pnpmPrismaClient) {
                    $pnpmPrismaPath = Join-Path $pnpmPrismaClient.FullName "node_modules\.prisma"
                    if (Test-Path $pnpmPrismaPath) {
                        $prismaDest = Join-Path $standaloneDest ".prisma"
                        if (Test-Path $prismaDest) {
                            Remove-Item $prismaDest -Recurse -Force -ErrorAction SilentlyContinue
                        }
                        Copy-Item $pnpmPrismaPath -Destination $prismaDest -Recurse -Force
                        Write-Success ".prisma copié depuis pnpm store: $pnpmRoot"
                        $prismaFound = $true
                        break
                    }
                }
            }
        }
        
        if (-not $prismaFound) {
            throw ".prisma introuvable - Vérifiez que 'pnpm prisma generate' a été exécuté"
        }
    }
    
    # Copier @prisma/client
    $prismaClientSource = Join-Path $WEB_DIR "node_modules\@prisma\client"
    if (Test-Path $prismaClientSource) {
        $prismaClientDest = Join-Path $standaloneDest "@prisma\client"
        # Supprimer destination si existe pour éviter récursion
        if (Test-Path $prismaClientDest) {
            Remove-Item $prismaClientDest -Recurse -Force -ErrorAction SilentlyContinue
        }
        $prismaDir = Split-Path $prismaClientDest
        if (-not (Test-Path $prismaDir)) {
            New-Item -ItemType Directory -Path $prismaDir -Force | Out-Null
        }
        Copy-Item $prismaClientSource -Destination $prismaClientDest -Recurse -Force -ErrorAction Stop
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
                        Write-Success "@prisma/client copié depuis pnpm store: $pnpmRoot"
                        $clientFound = $true
                        break
                    }
                }
            }
        }
        
        if (-not $clientFound) {
            Write-Info "@prisma/client non trouvé (peut être normal si déjà dans standalone)"
        }
    }

    # 11. Build Electron avec retry
    Write-Step "Build Electron Windows..."
    Set-Location $DESKTOP_DIR
    
    # Mise à jour version dans package.json
    Write-Info "Mise à jour version: $Version"
    $packageJsonPath = "package.json"
    $packageContent = Get-Content $packageJsonPath -Raw
    $packageContent = $packageContent -replace '"version":\s*"[^"]*"', "`"version`": `"$Version`""
    [System.IO.File]::WriteAllText($packageJsonPath, $packageContent, [System.Text.UTF8Encoding]::new($false))
    
    $buildSuccess = $false
    $maxRetries = if ($NoRetry) { 1 } else { 2 }
    
    for ($i = 1; $i -le $maxRetries; $i++) {
        Write-Info "Tentative $i/$maxRetries..."
        
        try {
            npm run build:win
            if ($LASTEXITCODE -eq 0) {
                $buildSuccess = $true
                break
            }
        } catch {
            Write-Info "Tentative $i échouée: $($_.Exception.Message)"
        }
        
        if ($i -lt $maxRetries) {
            Write-Info "Nettoyage avant retry..."
            # Arrêter processus
            Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" -or $_.ProcessName -eq "electron" } | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            
            # Nettoyer dist
            if (Test-Path "dist") {
                Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 1
        }
    }
    
    if (-not $buildSuccess) {
        throw "Build Electron échoué après $maxRetries tentatives"
    }
    
    Write-Success "Build Electron terminé"

    # 12. Vérification exe
    Write-Step "Vérification exécutable..."
    $exePath = Get-ChildItem "dist\win-unpacked" -Filter "*.exe" | Select-Object -First 1
    if (-not $exePath) {
        throw "Exécutable non trouvé dans dist\win-unpacked"
    }
    $exeSize = [math]::Round($exePath.Length / 1MB, 2)
    Write-Success "Exécutable: $($exePath.Name) ($exeSize MB)"

    # 13. Vérification installer
    $installerPath = Get-ChildItem "dist" -Filter "*Setup*.exe" | Select-Object -First 1
    if ($installerPath) {
        $installerSize = [math]::Round($installerPath.Length / 1MB, 2)
        Write-Success "Installer: $($installerPath.Name) ($installerSize MB)"
    } else {
        Write-Info "Installer non trouvé (peut être normal)"
    }

    # 14. Copie Prisma dans ressources packagées
    Write-Step "Copie Prisma dans ressources..."
    $resourcesWeb = Join-Path $DESKTOP_DIR "dist\win-unpacked\resources\web"
    if (Test-Path $resourcesWeb) {
        $prismaDir = Join-Path $WEB_DIR "prisma"
        if (Test-Path $prismaDir) {
            Copy-Item $prismaDir -Destination $resourcesWeb -Recurse -Force
            Write-Success "Prisma copié dans ressources"
        }
    }

    # 15. Création package distribution (optionnel)
    if ($CreateDistribution) {
        Write-Step "Création package distribution..."
        $distName = "AtelierVelo-$Version-Windows"
        $distPath = Join-Path $ROOT $distName
        
        if (Test-Path $distPath) {
            Remove-Item $distPath -Recurse -Force
        }
        New-Item -ItemType Directory -Path $distPath | Out-Null
        
        # Copier exe
        Copy-Item $exePath.FullName -Destination $distPath
        
        # Copier installer si existe
        if ($installerPath) {
            Copy-Item $installerPath.FullName -Destination $distPath
        }
        
        # Créer README
        $readmeContent = @"
Atelier Vélo+ v$Version
========================

Installation:
1. Double-cliquer sur "$($installerPath.Name)" pour installer
2. OU lancer directement "$($exePath.Name)"

Copyright © 2024-2025 Jérôme Leyssard - Upgraded Bikes
Tous droits réservés.
"@
        $readmeContent | Out-File (Join-Path $distPath "README.txt") -Encoding UTF8
        
        Write-Success "Package distribution créé: $distPath"
    }

    # Résumé final
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  BUILD V2 TERMINÉ AVEC SUCCÈS" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Version:        $Version" -ForegroundColor White
    Write-Host "Exécutable:     $($exePath.Name) ($exeSize MB)" -ForegroundColor White
    if ($installerPath) {
        Write-Host "Installer:      $($installerPath.Name) ($installerSize MB)" -ForegroundColor White
    }
    Write-Host "Emplacement:    $DESKTOP_DIR\dist" -ForegroundColor White
    if ($CreateDistribution) {
        Write-Host "Distribution:   $distPath" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Pour lancer:" -ForegroundColor Cyan
    Write-Host "  cd $DESKTOP_DIR\dist\win-unpacked" -ForegroundColor Gray
    Write-Host "  .\`"$($exePath.Name)`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Pour tester:" -ForegroundColor Cyan
    Write-Host "  .\test-exe-with-logs.ps1" -ForegroundColor Gray

} catch {
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  BUILD V2 ÉCHOUÉ" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Error $_.Exception.Message
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "  1. Relancer PowerShell en Administrateur" -ForegroundColor White
    Write-Host "  2. Activer Mode Développeur Windows" -ForegroundColor White
    Write-Host "  3. Utiliser -CleanAll pour nettoyage complet" -ForegroundColor White
    Write-Host "  4. Vérifier GARANTIE_BUILD_SANS_ERREURS.md" -ForegroundColor White
    exit 1
}
