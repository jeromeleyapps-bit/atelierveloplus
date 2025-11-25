# Build Electron NSIS avec logging détaillé
# Date: 22 novembre 2025

$ErrorActionPreference = "Continue"
$logFile = "build-nsis-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

Write-Host "=== BUILD ELECTRON NSIS ===" -ForegroundColor Cyan
Write-Host "Log: $logFile" -ForegroundColor Yellow
Write-Host ""

# Fonction de logging
function Write-Log {
    param($Message, $Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage -ForegroundColor $Color
    Add-Content -Path $logFile -Value $logMessage
}

# 1. Vérification configuration
Write-Log "1. VERIFICATION CONFIGURATION" "Cyan"
$targetNsis = Select-String -Path "electron-builder.config.yml" -Pattern "target: nsis" -Quiet
$useZip = Select-String -Path "electron-builder.config.yml" -Pattern "useZip: true" -Quiet

if ($targetNsis) {
    if ($useZip) {
        Write-Log "  [OK] Configuration NSIS correcte (avec useZip)" "Green"
    } else {
        Write-Log "  [AVERTISSEMENT] useZip non configuré (peut causer ENAMETOOLONG)" "Yellow"
    }
} else {
    Write-Log "  [AVERTISSEMENT] target: nsis non trouvé, utilisation de la config par défaut" "Yellow"
}

# 2. Nettoyage
Write-Log "2. NETTOYAGE DOSSIERS BUILD" "Cyan"
if (Test-Path "dist-electron") {
    Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
    Write-Log "  [OK] dist-electron supprime" "Green"
}
if (Test-Path "electron-resources") {
    Remove-Item -Recurse -Force "electron-resources" -ErrorAction SilentlyContinue
    Write-Log "  [OK] electron-resources supprime" "Green"
}

# 3. Build Next.js
Write-Log "3. BUILD NEXT.JS" "Cyan"
Write-Log "  Demarrage npm run build..." "Yellow"
$buildStart = Get-Date
npm run build 2>&1 | Tee-Object -FilePath $logFile -Append
$buildEnd = Get-Date
$buildDuration = ($buildEnd - $buildStart).TotalMinutes
Write-Log "  [OK] Build Next.js termine en $([math]::Round($buildDuration, 1)) minutes" "Green"

# 4. Préparation Electron
Write-Log "4. PREPARATION ELECTRON" "Cyan"
if (Test-Path "prepare-build-optimized.js") {
    node prepare-build-optimized.js 2>&1 | Tee-Object -FilePath $logFile -Append
    if ($LASTEXITCODE -eq 0) {
        Write-Log "  [OK] Preparation terminee" "Green"
    } else {
        Write-Log "  [ERREUR] Preparation echouee" "Red"
        exit 1
    }
} else {
    Write-Log "  [ERREUR] prepare-build-optimized.js non trouve" "Red"
    exit 1
}

# 5. Build Electron
Write-Log "5. BUILD ELECTRON NSIS" "Cyan"
Write-Log "  Desactivation signature (evite ENAMETOOLONG)..." "Yellow"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
Write-Log "  Demarrage electron-builder..." "Yellow"
$electronStart = Get-Date
npx electron-builder --win --x64 2>&1 | Tee-Object -FilePath $logFile -Append
$electronEnd = Get-Date
$electronDuration = ($electronEnd - $electronStart).TotalMinutes

if ($LASTEXITCODE -eq 0) {
    Write-Log "  [OK] Build Electron termine en $([math]::Round($electronDuration, 1)) minutes" "Green"
    
    # 6. Vérification résultat
    Write-Log "6. VERIFICATION RESULTAT" "Cyan"
    $installer = Get-ChildItem "dist-electron\*.exe" -ErrorAction SilentlyContinue
    if ($installer) {
        foreach ($file in $installer) {
            $sizeMB = [math]::Round($file.Length / 1MB, 1)
            Write-Log "  [OK] $($file.Name) ($sizeMB MB)" "Green"
        }
    } else {
        Write-Log "  [AVERTISSEMENT] Aucun .exe trouve" "Yellow"
    }
    
    Write-Log "" "White"
    Write-Log "=== BUILD REUSSI ===" "Green"
    Write-Log "Voir log complet: $logFile" "Yellow"
} else {
    Write-Log "  [ERREUR] Build Electron echoue" "Red"
    Write-Log "" "White"
    Write-Log "=== BUILD ECHOUE ===" "Red"
    Write-Log "Voir log complet: $logFile" "Yellow"
    exit 1
}


