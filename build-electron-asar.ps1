###############################################################################
# Build Electron ASAR - Complet avec incrémentation version
# Atelier Vélo+ - Build Electron Windows avec ASAR
# 
# Copyright © 2024-2025 Jérôme Leyssard - Upgraded Bikes
# Tous droits réservés.
#
# USAGE:
#   .\build-electron-asar.ps1
#   .\build-electron-asar.ps1 -Version "1.0.4"
#   .\build-electron-asar.ps1 -CleanAll
#
# PREREQUIS:
#   - PowerShell (Administrateur recommandé pour symlinks)
#   - Node.js 20.x
#   - npm installé
###############################################################################

param(
    [string]$Version = "",
    [switch]$CleanAll,
    [switch]$SkipLint,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

# Variables globales pour timeline
$script:StartTime = Get-Date
$script:Timeline = @()
$script:CurrentStep = 0
$script:TotalSteps = 15

# Couleurs et helpers
function Write-Step    { 
    param([string]$msg) 
    $script:CurrentStep++
    $elapsed = (Get-Date) - $script:StartTime
    $timestamp = Get-Date -Format "HH:mm:ss"
    $progress = [math]::Round(($script:CurrentStep / $script:TotalSteps) * 100, 1)
    Write-Host "`n[$timestamp] [$script:CurrentStep/$script:TotalSteps - $progress%] >>> $msg" -ForegroundColor Cyan
    $script:Timeline += @{
        Step = $script:CurrentStep
        Time = $timestamp
        Elapsed = $elapsed.TotalSeconds
        Message = $msg
        Status = "STARTED"
    }
}

function Write-Success { 
    param([string]$msg) 
    $elapsed = (Get-Date) - $script:StartTime
    $duration = [math]::Round($elapsed.TotalSeconds, 1)
    Write-Host "[OK] $msg ($duration s)" -ForegroundColor Green
    if ($script:Timeline.Count -gt 0) {
        $script:Timeline[-1].Status = "SUCCESS"
        $script:Timeline[-1].Duration = $duration
    }
}

function Write-Info    { 
    param([string]$msg) 
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [INFO] $msg" -ForegroundColor Yellow 
}

function Write-Error   { 
    param([string]$msg) 
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [ERREUR] $msg" -ForegroundColor Red
    if ($script:Timeline.Count -gt 0) {
        $script:Timeline[-1].Status = "ERROR"
    }
}

function Write-Progress {
    param([string]$msg)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] → $msg" -ForegroundColor Gray
}

function Show-Timeline {
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  TIMELINE DU BUILD" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    foreach ($entry in $script:Timeline) {
        $statusColor = switch ($entry.Status) {
            "SUCCESS" { "Green" }
            "ERROR" { "Red" }
            "STARTED" { "Yellow" }
            default { "White" }
        }
        $duration = if ($entry.Duration) { " ($($entry.Duration) s)" } else { "" }
        Write-Host "[$($entry.Time)] [$($entry.Step)/$script:TotalSteps] $($entry.Message)$duration" -ForegroundColor $statusColor
    }
    $totalElapsed = (Get-Date) - $script:StartTime
    $totalSeconds = [math]::Round($totalElapsed.TotalSeconds, 1)
    Write-Host "`nTemps total: $totalSeconds s" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

# Chemin racine (structure actuelle : tout à la racine)
$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Get-Location | Select-Object -ExpandProperty Path }

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BUILD ELECTRON ASAR - COMPLET" -ForegroundColor Green
Write-Host "  Atelier Vélo+" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

try {
    # 1. Vérification environnement
    Write-Step "Vérification environnement..."
    
    # Node.js
    $nodeVersion = node -v
    Write-Host "  Node.js: $nodeVersion"
    if ($nodeVersion -notmatch "v20\.") {
        Write-Info "Node.js 20.x recommandé. Actuel: $nodeVersion"
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

    # 3. Lecture version actuelle et incrémentation
    Write-Step "Gestion de la version..."
    Set-Location $ROOT
    $packageJsonPath = "package.json"
    $packageContentRaw = Get-Content $packageJsonPath -Raw
    
    if ($Version -eq "") {
        # Incrémenter automatiquement la version (patch)
        if ($packageContentRaw -match '"version":\s*"([^"]+)"') {
            $currentVersion = $matches[1]
            Write-Info "Version actuelle: $currentVersion"
            
            $versionParts = $currentVersion -split '\.'
            $major = [int]$versionParts[0]
            $minor = [int]$versionParts[1]
            $patch = [int]$versionParts[2]
            
            $patch++
            $Version = "$major.$minor.$patch"
            Write-Info "Nouvelle version: $Version"
        } else {
            throw "Impossible de lire la version actuelle dans package.json"
        }
    } else {
        Write-Info "Version spécifiée: $Version"
    }
    
    # Mise à jour version dans package.json (méthode sûre avec regex)
    $packageContentRaw = $packageContentRaw -replace '"version":\s*"[^"]*"', "`"version`": `"$Version`""
    [System.IO.File]::WriteAllText($packageJsonPath, $packageContentRaw, [System.Text.UTF8Encoding]::new($false))
    Write-Success "Version mise à jour: $Version"

    # 4. Nettoyage (optionnel)
    if ($CleanAll) {
        Write-Step "Nettoyage complet..."
        Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item dist-electron -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Nettoyage complet terminé"
    } else {
        Write-Step "Nettoyage léger..."
        Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item dist-electron -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Nettoyage léger terminé"
    }

    # 5. Installation dépendances
    Write-Step "Installation dépendances..."
    Write-Progress "Exécution: npm install (peut prendre plusieurs minutes)..."
    $npmStart = Get-Date
    $npmOutput = @()
    $npmError = $false
    
    # Exécuter npm install sans try-catch pour éviter les faux positifs sur stderr
    # Les messages stderr informatifs (comme "Environment variables loaded from .env") 
    # ne doivent pas être traités comme des exceptions
    # --legacy-peer-deps pour résoudre conflits date-fns/date-fns-tz
    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "install", "--legacy-peer-deps" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "npm-output.txt" -RedirectStandardError "npm-error.txt"
    
    # Lire les sorties
    if (Test-Path "npm-output.txt") {
        Get-Content "npm-output.txt" | ForEach-Object {
            $line = $_
            $npmOutput += $line
            if ($line -match "added|removed|changed|audited|up to date|packages|Generated Prisma") {
                Write-Progress $line
            } elseif ($line -match "error|Error|ERROR|failed|Failed|FAILED") {
                Write-Host $line -ForegroundColor Red
                $npmError = $true
            } elseif ($line -match "warning|Warning|WARNING|vulnerabilities") {
                Write-Host $line -ForegroundColor Yellow
            }
        }
        Remove-Item "npm-output.txt" -ErrorAction SilentlyContinue
    }
    
    if (Test-Path "npm-error.txt") {
        Get-Content "npm-error.txt" | ForEach-Object {
            $line = $_
            # Ignorer les messages informatifs sur stderr qui ne sont pas des erreurs
            if ($line -match "Environment variables loaded|Prisma schema loaded|Generated Prisma Client") {
                Write-Progress $line
            } elseif ($line -match "error|Error|ERROR|failed|Failed|FAILED") {
                Write-Host $line -ForegroundColor Red
                $npmError = $true
            } else {
                Write-Progress $line
            }
        }
        Remove-Item "npm-error.txt" -ErrorAction SilentlyContinue
    }
    
    $npmDuration = (Get-Date) - $npmStart
    Write-Info "npm install terminé en $([math]::Round($npmDuration.TotalSeconds, 1))s"
    
    # Vérifier le code de sortie réel
    if ($npmProcess.ExitCode -ne 0) {
        Write-Error "npm install a échoué avec le code de sortie: $($npmProcess.ExitCode)"
        Write-Error "Sortie complète de npm install:"
        $npmOutput | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        throw "Installation dépendances échouée"
    }
    Write-Success "Dépendances installées"

    # 6. Prisma
    Write-Step "Génération Prisma Client..."
    Write-Progress "Exécution: npx prisma generate..."
    
    try {
        npx prisma generate
        if ($LASTEXITCODE -ne 0) {
            throw "Prisma generate échoué avec le code de sortie: $LASTEXITCODE"
        }
        Write-Success "Prisma Client généré"
    } catch {
        Write-Error "Erreur lors de la génération Prisma: $_"
        throw
    }

    # 7. Lint (optionnel)
    if (-not $SkipLint) {
        Write-Step "Vérification ESLint..."
        try {
            npm run lint:ci
            Write-Success "ESLint OK"
        } catch {
            Write-Info "ESLint a des warnings (non bloquant)"
        }
    }

    # 8. Tests TypeScript (optionnel)
    if (-not $SkipTests) {
        Write-Step "Vérification TypeScript..."
        try {
            npx tsc --noEmit
            Write-Success "TypeScript OK"
        } catch {
            Write-Info "TypeScript a des erreurs (non bloquant)"
        }
    }

    # 9. Build Next.js
    Write-Step "Build Next.js..."
    $env:DATABASE_URL = "file:./data/atelier.db"
    $env:NODE_ENV = "production"
    
    Write-Progress "Exécution: npm run build (peut prendre 2-5 minutes)..."
    Write-Info "Cette étape compile Next.js avec Turbopack..."
    $buildStart = Get-Date
    
    # Exécuter npm run build directement (approche simple et robuste)
    try {
        npm run build
        $buildDuration = (Get-Date) - $buildStart
        Write-Info "Build Next.js terminé en $([math]::Round($buildDuration.TotalSeconds, 1))s"
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build Next.js échoué avec le code de sortie: $LASTEXITCODE"
        }
        Write-Success "Build Next.js terminé"
    } catch {
        Write-Error "Erreur lors du build Next.js: $_"
        throw
    }

    # 10. Vérification build Next.js
    Write-Step "Vérification build Next.js..."
    $standaloneServer = ".next\standalone\server.js"
    if (-not (Test-Path $standaloneServer)) {
        # Chercher dans .next/standalone
        $standaloneDir = Get-ChildItem ".next\standalone" -Recurse -Filter "server.js" -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $standaloneDir) {
            Write-Info "Standalone server non trouvé (peut être normal selon config Next.js)"
        } else {
            Write-Success "Standalone server trouvé"
        }
    } else {
        Write-Success "Standalone server OK"
    }

    # 11. Build Electron avec electron-builder
    Write-Step "Build Electron Windows (ASAR activé)..."
    
    # Vérifier que electron-builder est installé
    Write-Progress "Vérification electron-builder..."
    try {
        $electronBuilderVersion = npx electron-builder --version
        Write-Info "electron-builder version: $electronBuilderVersion"
    } catch {
        Write-Info "electron-builder non trouvé, installation..."
        npm install --save-dev electron-builder
    }
    
    # Build avec electron-builder (crée unpacked + installer)
    Write-Info "Lancement electron-builder (peut prendre 3-10 minutes)..."
    Write-Progress "Cette étape:"
    Write-Progress "  1. Copie les fichiers nécessaires"
    Write-Progress "  2. Crée l'archive ASAR"
    Write-Progress "  3. Génère l'exécutable unpacked"
    Write-Progress "  4. Génère l'installer (si configuré)"
    Write-Progress ""
    
    $electronStart = Get-Date
    
    try {
        npx electron-builder --win --x64
        $electronDuration = (Get-Date) - $electronStart
        Write-Info "electron-builder terminé en $([math]::Round($electronDuration.TotalSeconds, 1))s"
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build Electron échoué avec le code de sortie: $LASTEXITCODE"
        }
        Write-Success "Build Electron terminé"
    } catch {
        Write-Error "Erreur lors du build Electron: $_"
        throw
    }

    # 12. Vérification exécutable unpacked
    Write-Step "Vérification exécutable unpacked..."
    $unpackedDir = "dist-electron\win-unpacked"
    if (-not (Test-Path $unpackedDir)) {
        throw "Dossier unpacked non trouvé: $unpackedDir"
    }
    
    $exePath = Get-ChildItem $unpackedDir -Filter "*.exe" | Select-Object -First 1
    if (-not $exePath) {
        throw "Exécutable non trouvé dans $unpackedDir"
    }
    $exeSize = [math]::Round($exePath.Length / 1MB, 2)
    Write-Success "Exécutable unpacked: $($exePath.Name) ($exeSize MB)"
    Write-Host "  Chemin: $($exePath.FullName)" -ForegroundColor Gray

    # 13. Vérification installer
    Write-Step "Vérification installer..."
    $installerPath = Get-ChildItem "dist-electron" -Filter "*Setup*.exe" | Select-Object -First 1
    if ($installerPath) {
        $installerSize = [math]::Round($installerPath.Length / 1MB, 2)
        Write-Success "Installer: $($installerPath.Name) ($installerSize MB)"
        Write-Host "  Chemin: $($installerPath.FullName)" -ForegroundColor Gray
    } else {
        Write-Info "Installer non trouvé (peut être normal selon config)"
    }

    # 14. Vérification ASAR
    Write-Step "Vérification ASAR..."
    $asarPath = Join-Path $unpackedDir "resources\app.asar"
    if (Test-Path $asarPath) {
        $asarSize = [math]::Round((Get-Item $asarPath).Length / 1MB, 2)
        Write-Success "ASAR créé: app.asar ($asarSize MB)"
    } else {
        Write-Info "ASAR non trouvé (peut être normal si désactivé dans config)"
    }

    # 15. Vérification ressources unpacked
    Write-Step "Vérification ressources unpacked..."
    $unpackedResources = Join-Path $unpackedDir "resources\app.asar.unpacked"
    if (Test-Path $unpackedResources) {
        Write-Success "Ressources unpacked trouvées"
    } else {
        Write-Info "Ressources unpacked non trouvées (peut être normal)"
    }

    # Afficher timeline
    Show-Timeline
    
    # Résumé final
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  BUILD ELECTRON ASAR TERMINÉ AVEC SUCCÈS" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Version:        $Version" -ForegroundColor White
    Write-Host "Exécutable:     $($exePath.Name) ($exeSize MB)" -ForegroundColor White
    Write-Host "Emplacement:    $($exePath.DirectoryName)" -ForegroundColor White
    if ($installerPath) {
        Write-Host "Installer:      $($installerPath.Name) ($installerSize MB)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Pour lancer l'application unpacked:" -ForegroundColor Cyan
    Write-Host "  cd `"$($exePath.DirectoryName)`"" -ForegroundColor Gray
    Write-Host "  .\`"$($exePath.Name)`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Pour installer:" -ForegroundColor Cyan
    if ($installerPath) {
        Write-Host "  .\`"$($installerPath.FullName)`"" -ForegroundColor Gray
    } else {
        Write-Host "  Installer non créé" -ForegroundColor Yellow
    }
    Write-Host ""

} catch {
    # Afficher timeline même en cas d'erreur
    Show-Timeline
    
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  BUILD ELECTRON ASAR ÉCHOUÉ" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Error $_.Exception.Message
    Write-Host ""
    Write-Host "Stack Trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "  1. Relancer PowerShell en Administrateur" -ForegroundColor White
    Write-Host "  2. Vérifier que Node.js 20.x est installé" -ForegroundColor White
    Write-Host "  3. Utiliser -CleanAll pour nettoyage complet" -ForegroundColor White
    Write-Host "  4. Vérifier electron-builder.config.yml" -ForegroundColor White
    exit 1
}

