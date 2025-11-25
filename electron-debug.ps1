# Script Debug Electron - Logs Temps Réel
Write-Host "=== DEBUG ELECTRON - LOGS TEMPS RÉEL ===" -ForegroundColor Green

# Arrêter processus existants
Write-Host "🛑 Arrêt processus existants..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Nettoyer logs anciens
$logDir = "$env:APPDATA\Atelier Velo+\logs"
if (Test-Path $logDir) {
    Remove-Item "$logDir\*.log" -Force -ErrorAction SilentlyContinue
    Write-Host "🧹 Logs anciens nettoyés" -ForegroundColor Gray
}

# Lancer avec debug
Write-Host "🚀 Lancement Electron avec debug..." -ForegroundColor Green
$process = Start-Process -FilePath ".\dist-electron\win-unpacked\Atelier Velo+.exe" -ArgumentList "--enable-logging --log-level=debug --v=1" -PassThru

Write-Host "PID: $($process.Id)" -ForegroundColor Cyan
Write-Host "Surveillance des logs..." -ForegroundColor Yellow

# Surveillance logs
$timeout = 0
$maxTimeout = 60 # 60 secondes max

while ($timeout -lt $maxTimeout) {
    Clear-Host
    Write-Host "=== DEBUG ELECTRON - $($timeout)s ===" -ForegroundColor Green
    Write-Host "Processus: $($process.Id) - $((Get-Process -Id $process.Id -ErrorAction SilentlyContinue).Responding ? 'ACTIF' : 'INACTIF')" -ForegroundColor Cyan
    
    # Chercher logs dans tous les emplacements possibles
    $logPaths = @(
        "$env:APPDATA\Atelier Velo+\logs\main.log",
        "$env:LOCALAPPDATA\Atelier Velo+\logs\main.log", 
        "$env:USERPROFILE\AppData\Roaming\Atelier Velo+\logs\main.log",
        "$env:USERPROFILE\AppData\Local\Atelier Velo+\logs\main.log"
    )
    
    $foundLogs = $false
    foreach ($logPath in $logPaths) {
        if (Test-Path $logPath) {
            $foundLogs = $true
            Write-Host "`n📄 LOGS: $logPath" -ForegroundColor White
            $logs = Get-Content $logPath -Tail 20 -ErrorAction SilentlyContinue
            
            foreach ($line in $logs) {
                if ($line -match "error|Error|ERROR") {
                    Write-Host "❌ $line" -ForegroundColor Red
                } elseif ($line -match "warn|Warn|WARN") {
                    Write-Host "⚠️  $line" -ForegroundColor Yellow
                } elseif ($line -match "prisma|Prisma|PRISMA") {
                    Write-Host "🔮 $line" -ForegroundColor Magenta
                } elseif ($line -match "NEXT|next|server") {
                    Write-Host "🌐 $line" -ForegroundColor Blue
                } elseif ($line -match "INIT|init|Loading") {
                    Write-Host "🔄 $line" -ForegroundColor Green
                } else {
                    Write-Host "   $line" -ForegroundColor Gray
                }
            }
            break
        }
    }
    
    if (-not $foundLogs) {
        Write-Host "`n❌ Aucun log trouvé (recherche...)" -ForegroundColor Red
        Write-Host "🔍 Emplacements testés:" -ForegroundColor Gray
        foreach ($path in $logPaths) {
            Write-Host "   - $path" -ForegroundColor Gray
        }
    }
    
    # Vérifier si processus toujours actif
    if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
        Write-Host "`n💀 PROCESSUS TERMINÉ" -ForegroundColor Red
        Write-Host "Analyse des logs finaux..." -ForegroundColor Yellow
        
        # Afficher tous les logs disponibles
        foreach ($logPath in $logPaths) {
            if (Test-Path $logPath) {
                Write-Host "`n--- LOGS COMPLETS: $logPath ---" -ForegroundColor Cyan
                Get-Content $logPath -ErrorAction SilentlyContinue | ForEach-Object {
                    if ($_ -match "error|Error|ERROR") { Write-Host "❌ $_" -ForegroundColor Red }
                    elseif ($_ -match "warn|Warn|WARN") { Write-Host "⚠️  $_" -ForegroundColor Yellow }
                    elseif ($_ -match "prisma|Prisma") { Write-Host "🔮 $_" -ForegroundColor Magenta }
                    else { Write-Host "   $_" -ForegroundColor Gray }
                }
            }
        }
        break
    }
    
    $timeout++
    Start-Sleep 1
}

if ($timeout -ge $maxTimeout) {
    Write-Host "`n⏰ TIMEOUT 60s - Arrêt forcé" -ForegroundColor Red
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "`n🏁 Debug terminé" -ForegroundColor Green
