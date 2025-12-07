# Build Electron Complet avec Surveillance et DevTools - Atelier Velo+
# Date: 28 novembre 2025
# Version basee sur build-complet-fonctionnel.ps1 avec ajout surveillance

$ErrorActionPreference = "Stop"

$global:startTime = Get-Date
$global:buildLog = "build-surveille-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Log-Message {
    param($message, $color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logMsg = "[$timestamp] $message"
    Write-Host $logMsg -ForegroundColor $color
    Add-Content -Path $global:buildLog -Value $logMsg -ErrorAction SilentlyContinue
}

Write-Host "🚀 BUILD COMPLET FONCTIONNEL AVEC SURVEILLANCE - ATELIER VÉLO+" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Log-Message "=== DEBUT BUILD ===" "Cyan"

# ============================================================================= 
# ÉTAPE 1: NETTOYAGE COMPLET
# =============================================================================
Write-Host "`n🧹 ÉTAPE 1/7: Nettoyage complet..." -ForegroundColor Yellow
Log-Message "ETAPE 1: Nettoyage" "Yellow"

taskkill /F /IM "Atelier Velo+.exe" /T -ErrorAction SilentlyContinue
taskkill /F /IM "node.exe" /T -ErrorAction SilentlyContinue

Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "release" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "electron-resources\web" -Recurse -Force -ErrorAction SilentlyContinue

Log-Message "Nettoyage termine" "Green"

# =============================================================================
# ÉTAPE 2: BUILD NEXT.js
# =============================================================================
Write-Host "`n🔨 ÉTAPE 2/7: Build Next.js..." -ForegroundColor Yellow
Log-Message "ETAPE 2: Build Next.js" "Yellow"

if (Test-Path ".next") {
    Log-Message "Rebuild force" "Gray"
}
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue

$nextjsStart = Get-Date
npm run build 2>&1 | Tee-Object -FilePath $global:buildLog -Append

if ($LASTEXITCODE -ne 0) {
    Log-Message "Erreur build Next.js!" "Red"
    exit 1
}

if (-not (Test-Path ".next\server")) {
    Log-Message ".next/server non cree!" "Red"
    exit 1
}

$nextjsDuration = ((Get-Date) - $nextjsStart).TotalMinutes
Log-Message "Build Next.js termine en $([math]::Round($nextjsDuration, 1)) min" "Green"

# =============================================================================
# ÉTAPE 3: PRÉPARATION RESSOURCES
# =============================================================================
Write-Host "`n📦 ÉTAPE 3/7: Préparation ressources Electron..." -ForegroundColor Yellow
Log-Message "ETAPE 3: Preparation ressources" "Yellow"

$prepStart = Get-Date
node prepare-build-optimized.js 2>&1 | Tee-Object -FilePath $global:buildLog -Append

if ($LASTEXITCODE -ne 0) {
    Log-Message "Erreur preparation ressources!" "Red"
    exit 1
}

$prepDuration = ((Get-Date) - $prepStart).TotalSeconds
Log-Message "Preparation terminee en $([math]::Round($prepDuration, 1))s" "Green"

# =============================================================================
# ÉTAPE 4: VÉRIFICATION STRUCTURE CRITIQUE
# =============================================================================
Write-Host "`n🔍 ÉTAPE 4/7: Vérification structure + copie fichiers critiques..." -ForegroundColor Yellow
Log-Message "ETAPE 4: Verification structure" "Yellow"

if (-not (Test-Path "electron-resources\web\.next\server")) {
    if (Test-Path ".next\server") {
        Copy-Item -Path ".next\server" -Destination "electron-resources\web\.next\" -Recurse -Force
    }
}

if (-not (Test-Path "electron-resources\web\.next\static")) {
    if (Test-Path ".next\static") {
        Copy-Item -Path ".next\static" -Destination "electron-resources\web\.next\" -Recurse -Force
    }
}

if (-not (Test-Path "electron-resources\web\npm_modules\next\dist\server\next.js")) {
    Copy-Item -Path "node_modules" -Destination "electron-resources\web\npm_modules\" -Recurse -Force
}

if (-not (Test-Path "resources\icon.ico")) {
    Log-Message "Icône MANQUANTE!" "Red"
    exit 1
}

Log-Message "Structure validee" "Green"

# =============================================================================
# ÉTAPE 5: BUILD ELECTRON UNPACKED
# =============================================================================
Write-Host "`n📁 ÉTAPE 5/7: Build Electron Unpacked..." -ForegroundColor Yellow
Log-Message "ETAPE 5: Build Electron Unpacked" "Yellow"

$electronStart = Get-Date
Log-Message "Build peut prendre 10-20 minutes..." "Yellow"

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

# Lancer avec surveillance
$buildJob = Start-Job -ScriptBlock {
    param($configPath)
    Set-Location $using:PWD
    npx electron-builder --win --x64 --config $configPath --dir 2>&1
} -ArgumentList "electron-builder.config.yml"

# Surveillance en temps reel
while ($buildJob.State -eq "Running") {
    Start-Sleep -Seconds 5
    $elapsed = ((Get-Date) - $electronStart).TotalMinutes
    Write-Host "   ⏱️  Build en cours... $([math]::Round($elapsed, 1)) min" -ForegroundColor DarkGray
    
    $output = Receive-Job $buildJob
    if ($output) {
        foreach ($line in $output) {
            if ($line -match "ENAMETOOLONG|error|Error|ERROR") {
                Write-Host "   ⚠️  $line" -ForegroundColor Yellow
            } elseif ($line -match "packing|packed|done") {
                Write-Host "   📦 $line" -ForegroundColor Cyan
            }
        }
    }
}

$finalOutput = Receive-Job $buildJob
Remove-Job $buildJob -Force

if ($finalOutput -match "ENAMETOOLONG|failed|error") {
    Log-Message "Build Electron echoue!" "Red"
    exit 1
}

$electronDuration = ((Get-Date) - $electronStart).TotalMinutes
Log-Message "Build Electron termine en $([math]::Round($electronDuration, 1)) min" "Green"

# =============================================================================
# ÉTAPE 6: VÉRIFICATION ET CORRECTIONS
# =============================================================================
Write-Host "`n🔧 ÉTAPE 6/7: Vérification et corrections..." -ForegroundColor Yellow
Log-Message "ETAPE 6: Verification" "Yellow"

if (Test-Path "dist-electron\win-unpacked") {
    Log-Message "Structure unpacked presente" "Green"
    
    # Vérifier npm_modules
    if (-not (Test-Path "dist-electron\win-unpacked\resources\web\npm_modules")) {
        Copy-Item -Path "node_modules" -Destination "dist-electron\win-unpacked\resources\web\npm_modules\" -Recurse -Force
        Log-Message "npm_modules copie" "Green"
    }
}

# =============================================================================
# ÉTAPE 7: CRÉATION SCRIPT TEST DEVTOOLS
# =============================================================================
Write-Host "`n🧪 ÉTAPE 7/7: Création script test avec DevTools..." -ForegroundColor Yellow
Log-Message "ETAPE 7: Script test DevTools" "Yellow"

$exePath = "dist-electron\win-unpacked\Atelier Velo+.exe"
if (Test-Path $exePath) {
    $exeFullPath = (Resolve-Path $exePath).Path
    
    $testScript = @"
# Test Application avec DevTools - Atelier Velo+
Write-Host "`n🧪 TEST APPLICATION AVEC DEVTOOLS" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

`$exePath = "$exeFullPath"

Write-Host "`n1. Demarrage application..." -ForegroundColor Yellow
Write-Host "   Chemin: `$exePath" -ForegroundColor Gray

`$process = Start-Process -FilePath `$exePath -ArgumentList "--enable-logging" -PassThru

Write-Host "   PID: `$(`$process.Id)" -ForegroundColor Gray
Write-Host "`n2. Application demarree" -ForegroundColor Green
Write-Host "   - Appuyez sur F12 pour DevTools" -ForegroundColor Gray
Write-Host "   - Verifier console pour erreurs" -ForegroundColor Gray
Write-Host "`n3. Appuyez sur une touche pour arreter..." -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Get-Process | Where-Object { `$_.ProcessName -like "*Atelier*" } | Stop-Process -Force
Write-Host "`n✅ Test termine" -ForegroundColor Green
"@
    
    $testScriptPath = "test-app-devtools.ps1"
    $testScript | Out-File -FilePath $testScriptPath -Encoding UTF8
    
    Log-Message "Script test cree: $testScriptPath" "Green"
}

# =============================================================================
# RAPPORT FINAL
# =============================================================================
Write-Host "`n📊 RAPPORT FINAL" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

$totalTime = ((Get-Date) - $global:startTime).TotalMinutes
Log-Message "Temps total: $([math]::Round($totalTime, 1)) minutes" "Cyan"

if (Test-Path "dist-electron\win-unpacked\Atelier Velo+.exe") {
    Write-Host "`n✅ BUILD RÉUSSI !" -ForegroundColor Green
    
    $exeSize = [math]::Round((Get-Item "dist-electron\win-unpacked\Atelier Velo+.exe").Length / 1MB, 2)
    Write-Host "`n📦 Executable cree: $exeSize MB" -ForegroundColor Cyan
    
    Write-Host "`n🎯 Prochaines etapes:" -ForegroundColor Cyan
    Write-Host "  1. Verifier logo: dist-electron\win-unpacked\Atelier Velo+.exe" -ForegroundColor Gray
    Write-Host "  2. Tester avec DevTools: .\test-app-devtools.ps1" -ForegroundColor Gray
    
    Log-Message "BUILD REUSSI" "Green"
} else {
    Log-Message "BUILD ECHOUE - Executable non trouve" "Red"
}

Write-Host ("`n" + ("=" * 80)) -ForegroundColor Cyan
