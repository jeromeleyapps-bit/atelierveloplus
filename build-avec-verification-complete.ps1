# ============================================================================
# BUILD AVEC VÉRIFICATION COMPLÈTE
# ============================================================================
# Objectif : Build avec monitoring complet et vérifications
# Usage : .\build-avec-verification-complete.ps1
# ============================================================================

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$buildLog = "build-complet-$timestamp.log"

Write-Host "`n[BUILD] BUILD AVEC VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Logs : $buildLog`n" -ForegroundColor Gray

# Fonction de logging
function Write-BuildLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $buildLog -Value $logMessage
    Write-Host $logMessage -ForegroundColor $(switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    })
}

# ============================================================================
# ÉTAPE 1 : VÉRIFICATIONS PRE-BUILD
# ============================================================================
Write-BuildLog "========================================" "INFO"
Write-BuildLog "ÉTAPE 1/5 : VÉRIFICATIONS PRE-BUILD" "INFO"
Write-BuildLog "========================================" "INFO"

& .\scripts\verification-build-complete.ps1 -PreBuild -LogDir "logs-verification"
$verifyExitCode = $LASTEXITCODE

if ($verifyExitCode -ne 0 -and $verifyExitCode -ne $null) {
    Write-BuildLog "[ERROR] Verifications pre-build echouees (code: $verifyExitCode)" "ERROR"
    exit 1
} else {
    Write-BuildLog "[OK] Verifications pre-build reussies" "SUCCESS"
}

# ============================================================================
# ÉTAPE 2 : BUILD NEXT.JS
# ============================================================================
Write-BuildLog "`n========================================" "INFO"
Write-BuildLog "ÉTAPE 2/5 : BUILD NEXT.JS" "INFO"
Write-BuildLog "========================================" "INFO"

Write-BuildLog "Nettoyage .next/..." "INFO"
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue

Write-BuildLog "Lancement build Next.js..." "INFO"
$nextBuildStart = Get-Date
npm run build 2>&1 | Tee-Object -FilePath "build-nextjs-$timestamp.log" | ForEach-Object {
    Write-BuildLog $_ "INFO"
    if ($_ -match "error|Error|ERROR|fail|Fail") {
        Write-BuildLog "[WARN] Erreur detectee : $_" "WARN"
    }
}
$nextBuildDuration = (Get-Date) - $nextBuildStart

if ($LASTEXITCODE -ne 0) {
    Write-BuildLog "[ERROR] Build Next.js echoue" "ERROR"
    Write-BuildLog "Analyse des erreurs..." "INFO"
    & .\scripts\analyse-erreurs-build.ps1 -LogFile "build-nextjs-$timestamp.log"
    exit 1
}

    Write-BuildLog "[SUCCESS] Build Next.js termine en $([math]::Round($nextBuildDuration.TotalSeconds, 2))s" "SUCCESS"

# Vérifier BUILD_ID
if (-not (Test-Path ".next\BUILD_ID")) {
    Write-BuildLog "[WARN] BUILD_ID manquant - Creation..." "WARN"
    $buildId = [System.Guid]::NewGuid().ToString().Replace('-', '').Substring(0, 20)
    $buildId | Out-File -FilePath ".next\BUILD_ID" -Encoding utf8 -NoNewline
    Write-BuildLog "[SUCCESS] BUILD_ID cree : $buildId" "SUCCESS"
}

# ============================================================================
# ÉTAPE 3 : PREBUILD (prepare-build-optimized.js)
# ============================================================================
Write-BuildLog "`n========================================" "INFO"
Write-BuildLog "ÉTAPE 3/5 : PREBUILD" "INFO"
Write-BuildLog "========================================" "INFO"

Write-BuildLog "Lancement prepare-build-optimized.js..." "INFO"
$prebuildStart = Get-Date
node prepare-build-optimized.js 2>&1 | Tee-Object -FilePath "build-prebuild-$timestamp.log" | ForEach-Object {
    Write-BuildLog $_ "INFO"
    if ($_ -match "error|Error|ERROR|fail|Fail") {
        Write-BuildLog "[WARN] Erreur detectee : $_" "WARN"
    }
}
$prebuildDuration = (Get-Date) - $prebuildStart

if ($LASTEXITCODE -ne 0) {
    Write-BuildLog "[ERROR] Prebuild echoue" "ERROR"
    Write-BuildLog "Analyse des erreurs..." "INFO"
    & .\scripts\analyse-erreurs-build.ps1 -LogFile "build-prebuild-$timestamp.log"
    exit 1
}

    Write-BuildLog "[SUCCESS] Prebuild termine en $([math]::Round($prebuildDuration.TotalSeconds, 2))s" "SUCCESS"

# ============================================================================
# ÉTAPE 4 : VÉRIFICATIONS POST-BUILD
# ============================================================================
Write-BuildLog "`n========================================" "INFO"
Write-BuildLog "ÉTAPE 4/5 : VÉRIFICATIONS POST-BUILD" "INFO"
Write-BuildLog "========================================" "INFO"

& .\scripts\verification-build-complete.ps1 -PostBuild -LogDir "logs-verification"
$verifyExitCode = $LASTEXITCODE

if ($verifyExitCode -ne 0 -and $verifyExitCode -ne $null) {
    Write-BuildLog "[WARN] Verifications post-build : Erreurs detectees (code: $verifyExitCode)" "WARN"
} else {
    Write-BuildLog "[OK] Verifications post-build reussies" "SUCCESS"
}

# ============================================================================
# ÉTAPE 5 : BUILD ELECTRON
# ============================================================================
Write-BuildLog "`n========================================" "INFO"
Write-BuildLog "ÉTAPE 5/5 : BUILD ELECTRON" "INFO"
Write-BuildLog "========================================" "INFO"

Write-BuildLog "Nettoyage dist-electron..." "INFO"
Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue

Write-BuildLog "Lancement electron-builder..." "INFO"
$electronBuildStart = Get-Date
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --config electron-builder.config.yml --win --x64 --dir 2>&1 | 
    Tee-Object -FilePath "build-electron-$timestamp.log" | ForEach-Object {
        Write-BuildLog $_ "INFO"
        if ($_ -match "error|Error|ERROR|fail|Fail|ENAMETOOLONG") {
            Write-BuildLog "[WARN] Erreur detectee : $_" "WARN"
        }
    }
$electronBuildDuration = (Get-Date) - $electronBuildStart

if ($LASTEXITCODE -ne 0) {
    Write-BuildLog "[ERROR] Build Electron echoue" "ERROR"
    Write-BuildLog "Analyse des erreurs..." "INFO"
    & .\scripts\analyse-erreurs-build.ps1 -LogFile "build-electron-$timestamp.log"
    
    # Verifier si c'est ENAMETOOLONG
    $electronLog = Get-Content "build-electron-$timestamp.log" -Raw
    if ($electronLog -match "ENAMETOOLONG") {
        Write-BuildLog "[WARN] Erreur ENAMETOOLONG detectee" "WARN"
        Write-BuildLog "   Solution : Utiliser build portable" "INFO"
    }
    
    exit 1
}

    Write-BuildLog "[SUCCESS] Build Electron termine en $([math]::Round($electronBuildDuration.TotalSeconds, 2))s" "SUCCESS"

# ============================================================================
# RAPPORT FINAL
# ============================================================================
Write-BuildLog "`n========================================" "INFO"
Write-BuildLog "RAPPORT FINAL" "INFO"
Write-BuildLog "========================================" "INFO"

$totalDuration = (Get-Date) - $nextBuildStart
Write-BuildLog "Durée totale : $([math]::Round($totalDuration.TotalMinutes, 2)) minutes" "INFO"
Write-BuildLog "  - Next.js : $([math]::Round($nextBuildDuration.TotalSeconds, 2))s" "INFO"
Write-BuildLog "  - Prebuild : $([math]::Round($prebuildDuration.TotalSeconds, 2))s" "INFO"
Write-BuildLog "  - Electron : $([math]::Round($electronBuildDuration.TotalSeconds, 2))s" "INFO"

# Vérifier exécutable final
if (Test-Path "dist-electron\win-unpacked\Atelier Velo+.exe") {
    $exe = Get-Item "dist-electron\win-unpacked\Atelier Velo+.exe"
    Write-BuildLog "[SUCCESS] Executable cree : $([math]::Round($exe.Length/1MB, 2)) MB" "SUCCESS"
} else {
    Write-BuildLog "[ERROR] Executable non trouve" "ERROR"
}

Write-BuildLog "`n[INFO] Logs complets :" "INFO"
Write-BuildLog "   - Build general : $buildLog" "INFO"
Write-BuildLog "   - Next.js : build-nextjs-$timestamp.log" "INFO"
Write-BuildLog "   - Prebuild : build-prebuild-$timestamp.log" "INFO"
Write-BuildLog "   - Electron : build-electron-$timestamp.log" "INFO"
Write-BuildLog "   - Verifications : logs-verification\" "INFO"

Write-BuildLog "`n[SUCCESS] BUILD TERMINE" "SUCCESS"
