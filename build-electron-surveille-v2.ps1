# Build Electron Complet avec Surveillance - Atelier Velo+
# Date: 28 novembre 2025

$ErrorActionPreference = "Stop"

Write-Host "`n" -NoNewline
Write-Host "🚀 BUILD ELECTRON COMPLET AVEC SURVEILLANCE" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

$global:startTime = Get-Date
$global:buildLog = "build-surveille-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Log-Step {
    param($stepName, $message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logMsg = "[$timestamp] [$stepName] $message"
    Write-Host $logMsg -ForegroundColor Gray
    Add-Content -Path $global:buildLog -Value $logMsg
}

function Log-Success {
    param($message)
    Write-Host "✅ $message" -ForegroundColor Green
    Add-Content -Path $global:buildLog -Value "✅ $message"
}

function Log-Error {
    param($message)
    Write-Host "❌ $message" -ForegroundColor Red
    Add-Content -Path $global:buildLog -Value "❌ $message"
}

function Log-Warning {
    param($message)
    Write-Host "⚠️  $message" -ForegroundColor Yellow
    Add-Content -Path $global:buildLog -Value "⚠️  $message"
}

function Log-Info {
    param($message)
    Write-Host "ℹ️  $message" -ForegroundColor Cyan
    Add-Content -Path $global:buildLog -Value "ℹ️  $message"
}

# ============================================================================
# ETAPE 1: NETTOYAGE
# ============================================================================
Write-Host "`n🧹 ETAPE 1/6: NETTOYAGE" -ForegroundColor Yellow
Log-Step "NETTOYAGE" "Debut nettoyage"

try {
    Log-Info "Arret processus Electron/Node..."
    taskkill /F /IM "Atelier Velo+.exe" /T -ErrorAction SilentlyContinue | Out-Null
    taskkill /F /IM "node.exe" /T -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 2
    
    Log-Info "Suppression builds precedents..."
    Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "electron-resources\web" -Recurse -Force -ErrorAction SilentlyContinue
    
    Log-Success "Nettoyage termine"
} catch {
    Log-Error "Erreur nettoyage: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# ETAPE 2: VERIFICATION PREREQUIS
# ============================================================================
Write-Host "`n🔍 ETAPE 2/6: VERIFICATION PREREQUIS" -ForegroundColor Yellow
Log-Step "VERIFICATION" "Debut verification prerequis"

$prereqsOK = $true

if (-not (Test-Path ".next")) {
    Log-Error ".next/ manquant - Executer 'npm run build' d'abord"
    $prereqsOK = $false
} else {
    Log-Success ".next/ present"
}

if (-not (Test-Path "prepare-build-optimized.js")) {
    Log-Error "prepare-build-optimized.js manquant"
    $prereqsOK = $false
} else {
    Log-Success "Script preparation present"
}

if (-not (Test-Path "resources\icon.ico")) {
    Log-Error "resources\icon.ico manquant"
    $prereqsOK = $false
} else {
    $iconSize = [math]::Round((Get-Item "resources\icon.ico").Length / 1KB, 2)
    Log-Success "Icône presente ($iconSize KB)"
}

if (-not (Test-Path "electron-builder.config.yml")) {
    Log-Error "electron-builder.config.yml manquant"
    $prereqsOK = $false
} else {
    Log-Success "Configuration presente"
}

if (-not $prereqsOK) {
    Log-Error "Prerequis non satisfaits - Arret"
    exit 1
}

# ============================================================================
# ETAPE 3: PREPARATION RESSOURCES
# ============================================================================
Write-Host "`n📦 ETAPE 3/6: PREPARATION RESSOURCES ELECTRON" -ForegroundColor Yellow
Log-Step "PREPARATION" "Debut preparation ressources"

$prepStart = Get-Date

try {
    Log-Info "Execution prepare-build-optimized.js..."
    $prepOutput = node prepare-build-optimized.js 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Script preparation echoue (code: $LASTEXITCODE)"
    }
    
    Log-Info "Verification structure creee..."
    
    if (-not (Test-Path "electron-resources\web")) {
        throw "electron-resources\web non cree"
    }
    Log-Success "electron-resources/web cree"
    
    if (Test-Path "electron-resources\web\npm_modules") {
        $npmCount = (Get-ChildItem "electron-resources\web\npm_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Log-Success "npm_modules present ($npmCount fichiers)"
    } else {
        Log-Warning "npm_modules manquant"
    }
    
    if (Test-Path "electron-resources\web\.next") {
        $nextCount = (Get-ChildItem "electron-resources\web\.next" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Log-Success ".next copie ($nextCount fichiers)"
    } else {
        Log-Warning ".next manquant"
    }
    
    $totalSize = (Get-ChildItem "electron-resources\web" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Log-Success "Taille totale: $totalSizeMB MB"
    
    $prepDuration = ((Get-Date) - $prepStart).TotalSeconds
    Log-Success "Preparation terminee en $([math]::Round($prepDuration, 2))s"
    
} catch {
    Log-Error "Erreur preparation: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# ETAPE 4: BUILD ELECTRON
# ============================================================================
Write-Host "`n🔨 ETAPE 4/6: BUILD ELECTRON" -ForegroundColor Yellow
Log-Step "BUILD" "Debut build Electron"

$buildStart = Get-Date
$buildSuccess = $false

try {
    Log-Info "Lancement electron-builder..."
    Log-Warning "Cette etape peut prendre 10-20 minutes"
    
    # Desactiver signature code (evite timeout)
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    
    Log-Info "Build en cours (surveillance active)..."
    Log-Info "Logs detailles: $global:buildLog"
    
    # Lancer build avec surveillance en temps reel
    $buildJob = Start-Job -ScriptBlock {
        param($configPath)
        Set-Location $using:PWD
        npx electron-builder -c $configPath --win --x64 2>&1
    } -ArgumentList "electron-builder.config.yml"
    
    # Surveillance en temps reel
    $lastSize = 0
    $errorCount = 0
    
    while ($buildJob.State -eq "Running") {
        Start-Sleep -Seconds 5
        
        # Afficher progression
        $currentTime = ((Get-Date) - $buildStart).TotalMinutes
        Write-Host "   ⏱️  Build en cours... $([math]::Round($currentTime, 1)) min" -ForegroundColor DarkGray
        
        # Recuperer sortie partielle
        $output = Receive-Job $buildJob
        if ($output) {
            foreach ($line in $output) {
                Add-Content -Path $global:buildLog -Value $line
                
                if ($line -match "ENAMETOOLONG|error|Error|ERROR|fail|Fail|FAIL") {
                    Write-Host "   ⚠️  $line" -ForegroundColor Yellow
                    $errorCount++
                } elseif ($line -match "packing|packed|signing|creating|icon|done") {
                    Write-Host "   📦 $line" -ForegroundColor Cyan
                }
            }
        }
    }
    
    # Recuperer sortie finale
    $finalOutput = Receive-Job $buildJob
    $finalOutput | Add-Content -Path $global:buildLog
    
    Remove-Job $buildJob -Force
    
    # Verifier resultat
    if ($errorCount -gt 0 -and $finalOutput -match "ENAMETOOLONG|failed|error") {
        throw "Build echoue avec $errorCount erreur(s)"
    }
    
    Log-Success "Build Electron termine"
    $buildSuccess = $true
    $buildDuration = ((Get-Date) - $buildStart).TotalMinutes
    Log-Success "Build termine en $([math]::Round($buildDuration, 2)) minutes"
    
} catch {
    Log-Error "Erreur build: $($_.Exception.Message)"
    if (Test-Path $global:buildLog) {
        Log-Info "Consulter log: $global:buildLog"
        Get-Content $global:buildLog -Tail 30 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
    $buildSuccess = $false
}

# ============================================================================
# ETAPE 5: VERIFICATION RESULTAT
# ============================================================================
if ($buildSuccess) {
    Write-Host "`n✅ ETAPE 5/6: VERIFICATION RESULTAT BUILD" -ForegroundColor Yellow
    Log-Step "VERIFICATION" "Debut verification resultat"
    
    try {
        if (Test-Path "dist-electron\win-unpacked\Atelier Velo+.exe") {
            $exeSize = [math]::Round((Get-Item "dist-electron\win-unpacked\Atelier Velo+.exe").Length / 1MB, 2)
            Log-Success "Executable cree: Atelier Velo+.exe ($exeSize MB)"
        } else {
            throw "Atelier Velo+.exe non cree"
        }
        
        $installer = Get-ChildItem "dist-electron\*.exe" -Exclude "*portable*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($installer) {
            $installerSize = [math]::Round($installer.Length / 1MB, 2)
            Log-Success "Installateur cree: $($installer.Name) ($installerSize MB)"
        } else {
            Log-Warning "Installateur non trouve"
        }
        
        if (Test-Path "dist-electron\win-unpacked\resources\web\npm_modules") {
            $distNpmCount = (Get-ChildItem "dist-electron\win-unpacked\resources\web\npm_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
            Log-Success "npm_modules dans build ($distNpmCount fichiers)"
        }
        
        $totalUnpacked = (Get-ChildItem "dist-electron\win-unpacked" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $totalUnpackedMB = [math]::Round($totalUnpacked / 1MB, 2)
        Log-Success "Taille totale unpacked: $totalUnpackedMB MB"
        
    } catch {
        Log-Error "Erreur verification: $($_.Exception.Message)"
    }
}

# ============================================================================
# ETAPE 6: PREPARATION TEST AVEC DEVTOOLS
# ============================================================================
if ($buildSuccess) {
    Write-Host "`n🧪 ETAPE 6/6: PREPARATION TEST APPLICATION" -ForegroundColor Yellow
    Log-Step "TEST" "Preparation test avec DevTools"
    
    $exePath = "dist-electron\win-unpacked\Atelier Velo+.exe"
    
    if (Test-Path $exePath) {
        $exeFullPath = (Resolve-Path $exePath).Path
        
        $testScript = @"
# Test Application avec DevTools - Atelier Velo+
`$exePath = "$exeFullPath"

Write-Host "`n🧪 TEST APPLICATION AVEC DEVTOOLS" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`n1. Demarrage application avec DevTools..." -ForegroundColor Yellow
`$process = Start-Process -FilePath `$exePath -ArgumentList "--enable-logging" -PassThru

Write-Host "   PID: `$(`$process.Id)" -ForegroundColor Gray
Write-Host "`n2. Application demarree" -ForegroundColor Green
Write-Host "   - Appuyez sur F12 pour ouvrir DevTools" -ForegroundColor Gray
Write-Host "   - Verifier console pour erreurs" -ForegroundColor Gray
Write-Host "`n3. Appuyez sur une touche pour arreter..." -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Get-Process | Where-Object { `$_.ProcessName -like "*Atelier*" } | Stop-Process -Force
Write-Host "`n✅ Test termine" -ForegroundColor Green
"@
        
        $testScriptPath = "test-app-devtools.ps1"
        $testScript | Out-File -FilePath $testScriptPath -Encoding UTF8
        
        Log-Success "Script de test cree: $testScriptPath"
        Write-Host "`n🎯 Pour tester l'application avec DevTools:" -ForegroundColor Cyan
        Write-Host "   .\$testScriptPath" -ForegroundColor Yellow
    }
}

# ============================================================================
# RAPPORT FINAL
# ============================================================================
Write-Host "`n" -NoNewline
Write-Host "📊 RAPPORT FINAL" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

$totalTime = ((Get-Date) - $global:startTime).TotalMinutes
Write-Host "Temps total: $([math]::Round($totalTime, 2)) minutes" -ForegroundColor Cyan

if ($buildSuccess) {
    Write-Host "`n✅ BUILD REUSSI !" -ForegroundColor Green
    Write-Host "`n📦 Fichiers generes:" -ForegroundColor Cyan
    Get-ChildItem "dist-electron" -Recurse -File -ErrorAction SilentlyContinue | 
        Where-Object { $_.Extension -eq ".exe" -or $_.Name -like "*Atelier*" } |
        Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}} |
        Format-Table -AutoSize
    
    Write-Host "`n🎯 Prochaines etapes:" -ForegroundColor Cyan
    Write-Host "  1. Verifier logo: dist-electron\win-unpacked\Atelier Velo+.exe" -ForegroundColor Gray
    Write-Host "  2. Tester: .\test-app-devtools.ps1" -ForegroundColor Gray
} else {
    Write-Host "`n❌ BUILD ECHOUE" -ForegroundColor Red
    Write-Host "Consulter log: $global:buildLog" -ForegroundColor Yellow
}

Write-Host ("`n" + ("=" * 80)) -ForegroundColor Cyan
