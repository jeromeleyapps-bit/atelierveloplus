###############################################################################
# Build Electron DIRECT - Sans npm install (déjà fait par prepare-build)
# Atelier Vélo+ - Build Electron Windows avec ASAR
###############################################################################

param(
    [string]$Version = ""
)

$ErrorActionPreference = 'Stop'

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BUILD ELECTRON DIRECT (sans npm install)" -ForegroundColor Green
Write-Host "  Atelier Vélo+" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

try {
    # 1. Gestion version
    Write-Host "[1/3] Gestion version..." -ForegroundColor Cyan
    $packageJsonPath = "package.json"
    $packageContentRaw = Get-Content $packageJsonPath -Raw
    
    if ($Version -eq "") {
        if ($packageContentRaw -match '"version":\s*"([^"]+)"') {
            $currentVersion = $matches[1]
            Write-Host "  Version actuelle: $currentVersion" -ForegroundColor Yellow
            
            $versionParts = $currentVersion -split '\.'
            $major = [int]$versionParts[0]
            $minor = [int]$versionParts[1]
            $patch = [int]$versionParts[2]
            
            $patch++
            $Version = "$major.$minor.$patch"
            Write-Host "  Nouvelle version: $Version" -ForegroundColor Green
        } else {
            throw "Impossible de lire la version actuelle"
        }
    }
    
    # Mise à jour version
    $packageContentRaw = $packageContentRaw -replace '"version":\s*"[^"]*"', "`"version`": `"$Version`""
    [System.IO.File]::WriteAllText($packageJsonPath, $packageContentRaw, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  ✅ Version: $Version" -ForegroundColor Green
    Write-Host ""

    # 2. Vérifications
    Write-Host "[2/3] Vérifications..." -ForegroundColor Cyan
    
    $webPath = "electron-resources\web"
    $checks = @{
        "electron-resources/web" = (Test-Path $webPath)
        ".next/" = (Test-Path "$webPath\.next")
        "server.js" = (Test-Path "$webPath\server.js")
        "npm_modules/" = (Test-Path "$webPath\npm_modules")
        "@prisma/client" = (Test-Path "$webPath\npm_modules\@prisma\client")
    }
    
    $allOk = $true
    foreach ($item in $checks.GetEnumerator()) {
        if ($item.Value) {
            Write-Host "  ✅ $($item.Key)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($item.Key) MANQUANT" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    if (-not $allOk) {
        throw "Fichiers manquants - Exécutez d'abord: node prepare-build-optimized.js"
    }
    Write-Host ""

    # 3. Build electron-builder
    Write-Host "[3/3] Build electron-builder..." -ForegroundColor Cyan
    Write-Host "  Cette étape peut prendre 3-10 minutes..." -ForegroundColor Yellow
    Write-Host ""
    
    $buildStart = Get-Date
    npx electron-builder --win --x64
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build Electron échoué avec le code: $LASTEXITCODE"
    }
    
    $buildDuration = (Get-Date) - $buildStart
    Write-Host ""
    Write-Host "  ✅ Build terminé en $([math]::Round($buildDuration.TotalSeconds, 1))s" -ForegroundColor Green
    Write-Host ""

    # 4. Vérifications finales
    Write-Host "Vérifications finales..." -ForegroundColor Cyan
    
    $unpackedDir = "dist-electron\win-unpacked"
    if (-not (Test-Path $unpackedDir)) {
        throw "Dossier unpacked non trouvé: $unpackedDir"
    }
    
    $exePath = Get-ChildItem $unpackedDir -Filter "*.exe" | Select-Object -First 1
    if (-not $exePath) {
        throw "Exécutable non trouvé"
    }
    
    $exeSize = [math]::Round($exePath.Length / 1MB, 2)
    Write-Host "  ✅ Exécutable: $($exePath.Name) ($exeSize MB)" -ForegroundColor Green
    
    $installerPath = Get-ChildItem "dist-electron" -Filter "*Setup*.exe" | Select-Object -First 1
    if ($installerPath) {
        $installerSize = [math]::Round($installerPath.Length / 1MB, 2)
        Write-Host "  ✅ Installer: $($installerPath.Name) ($installerSize MB)" -ForegroundColor Green
    }
    
    $asarPath = Join-Path $unpackedDir "resources\app.asar"
    if (Test-Path $asarPath) {
        $asarSize = [math]::Round((Get-Item $asarPath).Length / 1MB, 2)
        Write-Host "  ✅ ASAR: app.asar ($asarSize MB)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  BUILD RÉUSSI !" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Version:     $Version" -ForegroundColor White
    Write-Host "Exécutable:  $($exePath.FullName)" -ForegroundColor White
    if ($installerPath) {
        Write-Host "Installer:   $($installerPath.FullName)" -ForegroundColor White
    }
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  BUILD ÉCHOUÉ" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}
