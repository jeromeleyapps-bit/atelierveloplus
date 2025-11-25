# Build Electron NSIS UNIQUEMENT (sans dir)
# Évite erreur ENAMETOOLONG lors de la signature avec les deux targets

$ErrorActionPreference = "Continue"
$logFile = "build-nsis-only-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

Write-Host "=== BUILD ELECTRON NSIS UNIQUEMENT ===" -ForegroundColor Cyan
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

# 1. Vérification prérequis
Write-Log "1. VERIFICATION PREREQUIS" "Cyan"
if (-not (Test-Path "electron-resources\web")) {
    Write-Log "  [ERREUR] electron-resources/web non trouve" "Red"
    Write-Log "  [INFO] Lancez d'abord: npm run build && node prepare-build-optimized.js" "Yellow"
    exit 1
}
Write-Log "  [OK] electron-resources/web trouve" "Green"

# 2. Vérification icône
if (Test-Path "resources\icon.ico") {
    $iconSize = (Get-Item "resources\icon.ico").Length / 1KB
    Write-Log "  [OK] Icône trouvee ($([math]::Round($iconSize, 1)) KB)" "Green"
} else {
    Write-Log "  [AVERTISSEMENT] resources/icon.ico non trouve" "Yellow"
}

# 3. Nettoyage dist-electron (garder seulement win-unpacked si existe)
Write-Log "2. NETTOYAGE" "Cyan"
if (Test-Path "dist-electron") {
    # Supprimer seulement les fichiers NSIS précédents, garder win-unpacked
    Get-ChildItem "dist-electron\*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem "dist-electron\*.zip" -ErrorAction SilentlyContinue | Remove-Item -Force
    Write-Log "  [OK] Fichiers NSIS precedents supprimes" "Green"
}

# 4. Build Electron NSIS UNIQUEMENT
Write-Log "3. BUILD ELECTRON NSIS" "Cyan"
Write-Log "  Desactivation signature (evite ENAMETOOLONG)..." "Yellow"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
Write-Log "  Demarrage electron-builder (NSIS uniquement)..." "Yellow"
$electronStart = Get-Date

# Construire seulement NSIS (sans dir)
npx electron-builder --win --x64 --config electron-builder.config.yml --config.win.target.0.target=nsis 2>&1 | Tee-Object -FilePath $logFile -Append

$electronEnd = Get-Date
$electronDuration = ($electronEnd - $electronStart).TotalMinutes

if ($LASTEXITCODE -eq 0) {
    Write-Log "  [OK] Build Electron termine en $([math]::Round($electronDuration, 1)) minutes" "Green"
    
    # 5. Vérification résultat
    Write-Log "4. VERIFICATION RESULTAT" "Cyan"
    $installer = Get-ChildItem "dist-electron\*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*unpacked*" }
    if ($installer) {
        foreach ($file in $installer) {
            $sizeMB = [math]::Round($file.Length / 1MB, 1)
            Write-Log "  [OK] $($file.Name) ($sizeMB MB)" "Green"
            Write-Log "  [INFO] Emplacement: $($file.FullName)" "Cyan"
        }
    } else {
        Write-Log "  [AVERTISSEMENT] Aucun installateur .exe trouve" "Yellow"
        Write-Log "  [INFO] Verifiez les logs pour les erreurs" "Yellow"
    }
    
    Write-Log "" "White"
    Write-Log "=== BUILD TERMINE ===" "Green"
    Write-Log "Voir log complet: $logFile" "Yellow"
} else {
    Write-Log "  [ERREUR] Build Electron echoue" "Red"
    Write-Log "" "White"
    Write-Log "=== BUILD ECHOUE ===" "Red"
    Write-Log "Voir log complet: $logFile" "Yellow"
    exit 1
}

