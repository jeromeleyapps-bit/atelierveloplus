# Build Electron Complet avec Surveillance - Atelier Velo+
# Date: 28 novembre 2025
# Script complet avec surveillance, logs et tests

$ErrorActionPreference = "Stop"

function Write-Header {
    param($message)
    Write-Host "`n$message" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
}

function Write-Success {
    param($message)
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($message)
    Write-Host "❌ $message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param($message)
    Write-Host "⚠️  $message" -ForegroundColor Yellow
}

function Write-Info {
    param($message)
    Write-Host "ℹ️  $message" -ForegroundColor Gray
}

# Variables de surveillance
$script:startTime = Get-Date
$script:errors = @()
$script:warnings = @()
$script:stepTimes = @{}

Write-Header "🚀 BUILD ELECTRON COMPLET AVEC SURVEILLANCE"

# ============================================================================
# ETAPE 1: NETTOYAGE
# ============================================================================
Write-Header "ETAPE 1/6: NETTOYAGE"

try {
    Write-Info "Arret processus Electron/Node..."
    taskkill /F /IM "Atelier Velo+.exe" /T -ErrorAction SilentlyContinue | Out-Null
    taskkill /F /IM "node.exe" /T -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 2
    
    Write-Info "Suppression builds precedents..."
    Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "electron-resources\web" -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Success "Nettoyage termine"
} catch {
    Write-Error-Custom "Erreur nettoyage: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# ETAPE 2: VERIFICATION PREREQUIS
# ============================================================================
Write-Header "ETAPE 2/6: VERIFICATION PREREQUIS"

try {
    Write-Info "Verification .next/..."
    if (-not (Test-Path ".next")) {
        throw ".next/ manquant - Executer 'npm run build' d'abord"
    }
    Write-Success ".next/ present"
    
    Write-Info "Verification prepare-build-optimized.js..."
    if (-not (Test-Path "prepare-build-optimized.js")) {
        throw "prepare-build-optimized.js manquant"
    }
    Write-Success "Script preparation present"
    
    Write-Info "Verification resources/icon.ico..."
    if (-not (Test-Path "resources\icon.ico")) {
        throw "resources\icon.ico manquant"
    }
    $iconSize = [math]::Round((Get-Item "resources\icon.ico").Length / 1KB, 2)
    Write-Success "Icône presente ($iconSize KB)"
    
    Write-Info "Verification electron-builder.config.yml..."
    if (-not (Test-Path "electron-builder.config.yml")) {
        throw "electron-builder.config.yml manquant"
    }
    Write-Success "Configuration presente"
} catch {
    Write-Error-Custom "Erreur verification: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# ETAPE 3: PREPARATION RESSOURCES (CRITIQUE)
# ============================================================================
Write-Header "ETAPE 3/6: PREPARATION RESSOURCES ELECTRON"

$prepStart = Get-Date
try {
    Write-Info "Execution prepare-build-optimized.js..."
    $prepLog = "build-prepare-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    
    node prepare-build-optimized.js 2>&1 | Tee-Object -FilePath $prepLog
    
    if ($LASTEXITCODE -ne 0) {
        throw "Script preparation echoue (code: $LASTEXITCODE)"
    }
    
    Write-Info "Verification structure creee..."
    if (-not (Test-Path "electron-resources\web")) {
        throw "electron-resources\web non cree"
    }
    Write-Success "electron-resources/web cree"
    
    if (-not (Test-Path "electron-resources\web\npm_modules")) {
        Write-Warning-Custom "npm_modules manquant - verifier renommage"
    } else {
        $npmCount = (Get-ChildItem "electron-resources\web\npm_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Success "npm_modules present ($npmCount fichiers)"
    }
    
    if (Test-Path "electron-resources\web\.next") {
        $nextCount = (Get-ChildItem "electron-resources\web\.next" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Success ".next copie ($nextCount fichiers)"
    } else {
        Write-Warning-Custom ".next manquant dans electron-resources/web"
    }
    
    $totalSize = (Get-ChildItem "electron-resources\web" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Success "Taille totale: $totalSizeMB MB"
    
    $prepDuration = ((Get-Date) - $prepStart).TotalSeconds
    $script:stepTimes["Preparation"] = $prepDuration
    Write-Success "Preparation terminee en $([math]::Round($prepDuration, 2))s"
} catch {
    $script:errors += "Preparation: $($_.Exception.Message)"
    Write-Error-Custom "Erreur preparation: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# ETAPE 4: BUILD ELECTRON
# ============================================================================
Write-Header "ETAPE 4/6: BUILD ELECTRON"

$buildStart = Get-Date
$buildSuccess = $false

try {
    Write-Info "Lancement electron-builder..."
    Write-Warning-Custom "Cette etape peut prendre 10-20 minutes"
    
    $buildLog = "build-electron-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    Write-Info "Logs enregistres dans: $buildLog"
    
    # Lancer build avec logs
    Write-Info "Build en cours (surveillance active)..."
    
    # Surveiller le build en arriere-plan
    $monitorJob = Start-Job -ScriptBlock {
        param($logPath)
        $lastSize = 0
        $lastLines = @()
        while ($true) {
            if (Test-Path $logPath) {
                $currentSize = (Get-Item $logPath).Length
                if ($currentSize -gt $lastSize) {
                    $newLines = Get-Content $logPath | Select-Object -Skip ($lastLines.Count)
                    foreach ($line in $newLines) {
                        if ($line -match "error|Error|ERROR|ENAMETOOLONG") {
                            Write-Output "ERROR: $line"
                        } elseif ($line -match "packing|packed|signing|creating|icon") {
                            Write-Output "INFO: $line"
                        }
                    }
                    $lastLines = Get-Content $logPath
                    $lastSize = $currentSize
                }
            }
            Start-Sleep -Seconds 5
        }
    } -ArgumentList $buildLog
    
    # Lancer le build
    $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
    npx electron-builder -c electron-builder.config.yml --win --x64 2>&1 | Tee-Object -FilePath $buildLog
    
    # Arreter surveillance
    Stop-Job $monitorJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $monitorJob -ErrorAction SilentlyContinue | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Build echoue (code: $LASTEXITCODE)"
        Write-Info "Dernieres lignes du log:"
        Get-Content $buildLog -Tail 30 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        throw "Build Electron echoue"
    }
    
    Write-Success "Build Electron termine avec succes"
    $buildSuccess = $true
    $buildDuration = ((Get-Date) - $buildStart).TotalSeconds / 60
    $script:stepTimes["Build Electron"] = $buildDuration
    Write-Success "Build termine en $([math]::Round($buildDuration, 2)) minutes"
    
} catch {
    $script:errors += "Build Electron: $($_.Exception.Message)"
    Write-Error-Custom "Erreur build: $($_.Exception.Message)"
    if (Test-Path $buildLog) {
        Write-Info "Consulter log complet: $buildLog"
    }
}

# ============================================================================
# ETAPE 5: VERIFICATION RESULTAT
# ============================================================================
if ($buildSuccess) {
    Write-Header "ETAPE 5/6: VERIFICATION RESULTAT BUILD"
    
    try {
        Write-Info "Verification fichiers generes..."
        
        if (Test-Path "dist-electron\win-unpacked\Atelier Velo+.exe") {
            $exeSize = [math]::Round((Get-Item "dist-electron\win-unpacked\Atelier Velo+.exe").Length / 1MB, 2)
            Write-Success "Executable cree: Atelier Velo+.exe ($exeSize MB)"
            Write-Info "Icone integree dans exe (verifier visuellement dans explorer)"
        } else {
            throw "Atelier Velo+.exe non cree"
        }
        
        $installer = Get-ChildItem "dist-electron\*.exe" -Exclude "*portable*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($installer) {
            $installerSize = [math]::Round($installer.Length / 1MB, 2)
            Write-Success "Installateur cree: $($installer.Name) ($installerSize MB)"
        } else {
            Write-Warning-Custom "Installateur non trouve (unpacked uniquement ?)"
        }
        
        if (Test-Path "dist-electron\win-unpacked\resources\web") {
            Write-Success "Structure resources/web presente"
            
            if (Test-Path "dist-electron\win-unpacked\resources\web\npm_modules") {
                $distNpmCount = (Get-ChildItem "dist-electron\win-unpacked\resources\web\npm_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
                Write-Success "npm_modules dans build ($distNpmCount fichiers)"
            } else {
                Write-Warning-Custom "npm_modules absent dans build dist"
            }
        }
        
        $totalUnpacked = (Get-ChildItem "dist-electron\win-unpacked" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $totalUnpackedMB = [math]::Round($totalUnpacked / 1MB, 2)
        Write-Success "Taille totale unpacked: $totalUnpackedMB MB"
        
        Write-Success "Verification terminee"
    } catch {
        $script:errors += "Verification: $($_.Exception.Message)"
        Write-Error-Custom "Erreur verification: $($_.Exception.Message)"
    }
}

# ============================================================================
# ETAPE 6: PREPARATION TEST AVEC DEVTOOLS
# ============================================================================
if ($buildSuccess) {
    Write-Header "ETAPE 6/6: PREPARATION TEST APPLICATION"
    
    $exePath = "dist-electron\win-unpacked\Atelier Velo+.exe"
    
    if (Test-Path $exePath) {
        Write-Info "Creation script de test avec DevTools..."
        
        $testScriptContent = @"
# Test Application avec DevTools - Atelier Velo+
# Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

`$exePath = "$((Resolve-Path $exePath).Path)"
`$exeDir = Split-Path `$exePath

Write-Host "`n🧪 TEST APPLICATION AVEC DEVTOOLS" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n1. Demarrage application..." -ForegroundColor Yellow
Write-Host "   Chemin: `$exePath" -ForegroundColor Gray

# Lancer avec DevTools automatiques
`$process = Start-Process -FilePath `$exePath -ArgumentList "--enable-logging", "--dev" -PassThru

Write-Host "   PID: `$(`$process.Id)" -ForegroundColor Gray
Write-Host "`n2. Application demarree" -ForegroundColor Green
Write-Host "   - DevTools devrait s'ouvrir automatiquement (F12 si besoin)" -ForegroundColor Gray
Write-Host "   - Verifier console pour erreurs" -ForegroundColor Gray
Write-Host "   - Verifier que l'application fonctionne" -ForegroundColor Gray

Write-Host "`n3. Surveillance en cours..." -ForegroundColor Yellow
Write-Host "   Appuyez sur une touche pour arreter l'application..." -ForegroundColor Gray
`$null = `$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`n4. Arret application..." -ForegroundColor Yellow
Get-Process | Where-Object { `$_.ProcessName -like "*Atelier*" -or `$_.MainWindowTitle -like "*Atelier*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "`n✅ Test termine" -ForegroundColor Green
"@
        
        $testScriptPath = "test-app-devtools.ps1"
        $testScriptContent | Out-File -FilePath $testScriptPath -Encoding UTF8
        
        Write-Success "Script de test cree: $testScriptPath"
        Write-Info "Pour tester l'application avec DevTools, executez:"
        Write-Host "   .\$testScriptPath" -ForegroundColor Yellow
    } else {
        Write-Warning-Custom "Executable non trouve - Test ignore"
    }
}

# ============================================================================
# RAPPORT FINAL
# ============================================================================
Write-Header "📊 RAPPORT FINAL"

$totalTime = ((Get-Date) - $script:startTime).TotalMinutes

Write-Host "Temps total: $([math]::Round($totalTime, 2)) minutes" -ForegroundColor Cyan
Write-Host "`nDetail par etape:" -ForegroundColor Cyan
foreach ($step in $script:stepTimes.Keys) {
    $time = $script:stepTimes[$step]
    if ($time -gt 1) {
        Write-Host "  - $step : $([math]::Round($time, 2)) minutes" -ForegroundColor Gray
    } else {
        Write-Host "  - $step : $([math]::Round($time, 2))s" -ForegroundColor Gray
    }
}

if ($script:errors.Count -gt 0) {
    Write-Host "`n❌ ERREURS ($($script:errors.Count)):" -ForegroundColor Red
    foreach ($error in $script:errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}

if ($script:warnings.Count -gt 0) {
    Write-Host "`n⚠️  AVERTISSEMENTS ($($script:warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $script:warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
}

if ($buildSuccess -and $script:errors.Count -eq 0) {
    Write-Host "`n✅ BUILD REUSSI !" -ForegroundColor Green
    Write-Host "`n📦 Fichiers generes:" -ForegroundColor Cyan
    Get-ChildItem "dist-electron" -Recurse -File | 
        Where-Object { $_.Extension -in @('.exe', '.dll') -or $_.Name -like "*Atelier*" } |
        Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}, Directory |
        Format-Table -AutoSize
    
    Write-Host "`n🎯 Prochaines etapes:" -ForegroundColor Cyan
    Write-Host "  1. Verifier logo dans explorer (dist-electron\win-unpacked\Atelier Velo+.exe)" -ForegroundColor Gray
    Write-Host "  2. Tester l'application: .\test-app-devtools.ps1" -ForegroundColor Gray
    Write-Host "  3. Installer et tester l'installateur" -ForegroundColor Gray
} else {
    Write-Host "`n❌ BUILD ECHOUE" -ForegroundColor Red
    Write-Host "Verifier les erreurs ci-dessus" -ForegroundColor Yellow
}

Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan