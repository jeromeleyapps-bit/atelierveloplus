# ============================================================================
# Script de creation d'installateur pour Atelier Velo+
# ============================================================================
# Contourne le probleme ENAMETOOLONG de NSIS en creant un installateur
# base sur 7-Zip SFX (Self-Extracting Archive)
# ============================================================================

param(
    [switch]$SkipBuild,
    [switch]$PortableOnly
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Set-Location $projectRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CREATION INSTALLATEUR ATELIER VELO+"      -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Configuration
$appName = "Atelier Velo+"
$version = (Get-Content "package.json" | ConvertFrom-Json).version
$buildDir = "dist-electron\win-unpacked"
$outputDir = "dist-electron"
$zipName = "$appName-$version-win-x64.zip"
$installerName = "$appName-$version-Setup.exe"

Write-Host ""
Write-Host "[INFO] Version: $version" -ForegroundColor Yellow

# Etape 1: Build Electron (si pas skip)
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "[1/4] Build Electron..." -ForegroundColor Green
    
    # Nettoyer
    if (Test-Path $outputDir) {
        Remove-Item $outputDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Build
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    npx electron-builder --config electron-builder.config.yml --win --x64 --dir
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Erreur lors du build Electron" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[1/4] Build Electron (SKIP)" -ForegroundColor Gray
}

# Verifier que le build existe
if (-not (Test-Path $buildDir)) {
    Write-Host "[ERREUR] Dossier build non trouve: $buildDir" -ForegroundColor Red
    exit 1
}

# Etape 2: Creer l'archive ZIP portable
Write-Host ""
Write-Host "[2/4] Creation archive ZIP portable..." -ForegroundColor Green

$zipPath = Join-Path $outputDir $zipName
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Utiliser 7-Zip si disponible, sinon Compress-Archive
$7zipPath = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $7zipPath) {
    Write-Host "  Utilisation de 7-Zip (meilleure compression)..."
    # Changer de repertoire pour avoir les fichiers a la racine du ZIP
    Push-Location $buildDir
    & $7zipPath a -tzip -mx=9 "..\..\$zipPath" "*" | Out-Null
    Pop-Location
} else {
    Write-Host "  Utilisation de Compress-Archive..."
    # Compress-Archive garde la structure relative
    Push-Location $buildDir
    Compress-Archive -Path "*" -DestinationPath "..\..\$zipPath" -CompressionLevel Optimal
    Pop-Location
}

$zipSizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "  [OK] ZIP cree: $zipName - $zipSizeMB MB" -ForegroundColor Green

if ($PortableOnly) {
    Write-Host ""
    Write-Host "[OK] Mode portable uniquement - Termine!" -ForegroundColor Green
    Write-Host "   Archive: $zipPath" -ForegroundColor Yellow
    exit 0
}

# Etape 3: Creer l'installateur SFX (si 7-Zip disponible)
Write-Host ""
Write-Host "[3/4] Creation installateur SFX..." -ForegroundColor Green

if (-not (Test-Path $7zipPath)) {
    Write-Host "  [WARN] 7-Zip non trouve - Installateur SFX non cree" -ForegroundColor Yellow
    Write-Host "  [INFO] Installez 7-Zip pour creer un installateur auto-extractible" -ForegroundColor Yellow
} else {
    # Creer le fichier de configuration SFX
    $sfxConfig = @"
;!@Install@!UTF-8!
Title="$appName $version"
BeginPrompt="Voulez-vous installer $appName $version ?"
ExtractDialogText="Extraction en cours..."
ExtractPathText="Dossier d'installation:"
ExtractTitle="Installation de $appName"
GUIFlags="8+32+64+256+4096"
GUIMode="1"
InstallPath="%%ProgramFiles%%\\$appName"
OverwriteMode="1"
RunProgram="\"%%ProgramFiles%%\\$appName\\$appName.exe\""
;!@InstallEnd@!
"@
    
    $sfxConfigPath = Join-Path $outputDir "sfx_config.txt"
    $sfxConfig | Out-File -FilePath $sfxConfigPath -Encoding UTF8
    
    # Creer l'archive 7z
    $7zPath = Join-Path $outputDir "app.7z"
    if (Test-Path $7zPath) { Remove-Item $7zPath -Force }
    
    Write-Host "  Compression 7z (peut prendre quelques minutes)..."
    & $7zipPath a -t7z -mx=9 -mf=BCJ2 -r $7zPath "$buildDir\*" | Out-Null
    
    # Combiner SFX + config + archive
    $sfxModule = "C:\Program Files\7-Zip\7z.sfx"
    $installerPath = Join-Path $outputDir $installerName
    
    if (Test-Path $sfxModule) {
        Write-Host "  Creation de l'installateur..."
        
        # Methode: copier binaire SFX + config + archive
        $sfxBytes = [System.IO.File]::ReadAllBytes($sfxModule)
        $configBytes = [System.Text.Encoding]::UTF8.GetBytes($sfxConfig + "`r`n")
        $archiveBytes = [System.IO.File]::ReadAllBytes($7zPath)
        
        $installerBytes = $sfxBytes + $configBytes + $archiveBytes
        [System.IO.File]::WriteAllBytes($installerPath, $installerBytes)
        
        $installerSizeMB = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
        Write-Host "  [OK] Installateur cree: $installerName - $installerSizeMB MB" -ForegroundColor Green
        
        # Nettoyer fichiers temporaires
        Remove-Item $sfxConfigPath -Force -ErrorAction SilentlyContinue
        Remove-Item $7zPath -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "  [WARN] Module SFX non trouve: $sfxModule" -ForegroundColor Yellow
    }
}

# Etape 4: Essayer Inno Setup si disponible
$innoPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
$innoScript = Join-Path $scriptDir "installer.iss"
$innoInstallerName = "$appName-$version-Setup-Inno.exe"

if ((Test-Path $innoPath) -and (Test-Path $innoScript)) {
    Write-Host ""
    Write-Host "[4/5] Creation installateur Inno Setup..." -ForegroundColor Green
    
    # Compiler avec Inno Setup
    & $innoPath $innoScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Installateur Inno Setup cree" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Erreur Inno Setup (code: $LASTEXITCODE)" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[4/5] Inno Setup (SKIP - non installe)" -ForegroundColor Gray
    Write-Host "  [INFO] Pour un installateur plus professionnel:" -ForegroundColor Yellow
    Write-Host "         https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
}

# Etape 5: Resume
Write-Host ""
Write-Host "[5/5] Resume" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

$outputs = @()
if (Test-Path (Join-Path $outputDir $zipName)) {
    $outputs += "[ZIP] Portable: $zipName"
}
if (Test-Path (Join-Path $outputDir $installerName)) {
    $outputs += "[EXE] Installateur SFX: $installerName"
}
if (Test-Path (Join-Path $outputDir $innoInstallerName)) {
    $outputs += "[EXE] Installateur Inno: $innoInstallerName"
}
$outputs += "[DIR] Unpacked: $buildDir"

foreach ($output in $outputs) {
    Write-Host "  $output" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] Creation terminee avec succes!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
