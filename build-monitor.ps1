# Build Monitor Temps Réel - Electron + Next.js
# Surveillance des erreurs JavaScript en temps réel

Clear-Host
Write-Host "=== BUILD MONITOR - ATELIER VÉLO+ ===" -ForegroundColor Green
Write-Host "Démarrage surveillance..." -ForegroundColor Yellow

while ($true) {
    Clear-Host
    Write-Host "=== BUILD MONITOR ===" -ForegroundColor Green
    Write-Host "Heure: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Gray
    
    # 1. LOGS ELECTRON (main process)
    Write-Host "`n📱 ELECTRON LOGS" -ForegroundColor Cyan
    $logPaths = @(
        "$env:APPDATA\Atelier Velo+\logs\main.log",
        "$env:APPDATA\Atelier Velo+\logs\production.log",
        "$env:LOCALAPPDATA\Atelier Velo+\logs\main.log"
    )
    
    $foundLogs = $false
    foreach ($logPath in $logPaths) {
        if (Test-Path $logPath) {
            $foundLogs = $true
            $logs = Get-Content $logPath -Tail 10
            Write-Host "📄 $logPath" -ForegroundColor White
            foreach ($line in $logs) {
                if ($line -match "error|Error|ERROR") {
                    Write-Host $line -ForegroundColor Red
                } elseif ($line -match "warn|Warn|WARN") {
                    Write-Host $line -ForegroundColor Yellow
                } elseif ($line -match "prisma|Prisma|PRISMA") {
                    Write-Host $line -ForegroundColor Magenta
                } else {
                    Write-Host $line -ForegroundColor Gray
                }
            }
        }
    }
    
    if (-not $foundLogs) {
        Write-Host "❌ Aucun log Electron trouvé" -ForegroundColor Red
        Write-Host "🔍 Recherche dans: $env:APPDATA\Atelier Velo+\logs\" -ForegroundColor Gray
    }
    
    # 2. PROCESSUS ACTIFS
    Write-Host "`n⚡ PROCESSUS ACTIFS" -ForegroundColor Cyan
    $processes = Get-Process | Where-Object { 
        $_.ProcessName -like "*Atelier*" -or 
        $_.ProcessName -like "*electron*" -or
        $_.MainWindowTitle -like "*Atelier*"
    } | Select-Object Id, ProcessName, CPU, WorkingSet
    
    if ($processes.Count -gt 0) {
        foreach ($proc in $processes) {
            $cpu = [math]::Round($proc.CPU, 2)
            $mem = [math]::Round($proc.WorkingSet / 1MB, 2)
            Write-Host "🔄 PID:$($proc.Id) $($proc.ProcessName) CPU:${cpu}s MEM:${mem}MB" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Aucun processus Atelier trouvé" -ForegroundColor Red
    }
    
    # 3. PORTS UTILISÉS
    Write-Host "`n🌐 PORTS ACTIFS" -ForegroundColor Cyan
    try {
        $ports = Get-NetTCPConnection | Where-Object { 
            $_.LocalPort -ge 3000 -and $_.LocalPort -le 3010 -and 
            $_.State -eq "Listen"
        } | Select-Object LocalPort, State, OwningProcess
        
        if ($ports.Count -gt 0) {
            foreach ($port in $ports) {
                $procName = (Get-Process -Id $port.OwningProcess -ErrorAction SilentlyContinue).ProcessName
                Write-Host "🔌 Port $($port.LocalPort) - $procName (PID:$($port.OwningProcess))" -ForegroundColor White
            }
        } else {
            Write-Host "❌ Aucun port 3000-3010 utilisé" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Impossible de vérifier les ports" -ForegroundColor Yellow
    }
    
    # 4. BUILD STATUS
    Write-Host "`n📦 BUILD STATUS" -ForegroundColor Cyan
    $buildPath = ".\dist-electron\win-unpacked"
    if (Test-Path $buildPath) {
        $exePath = "$buildPath\Atelier Velo+.exe"
        if (Test-Path $exePath) {
            $exeInfo = Get-Item $exePath
            Write-Host "✅ Build trouvé: $($exeInfo.LastWriteTime)" -ForegroundColor Green
            Write-Host "📁 Taille: $([math]::Round($exeInfo.Length / 1MB, 2)) MB" -ForegroundColor White
        } else {
            Write-Host "❌ Exécutable manquant" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Build introuvable" -ForegroundColor Red
    }
    
    # 5. ACTIONS RAPIDES
    Write-Host "`n🎯 ACTIONS" -ForegroundColor Cyan
    Write-Host "[R] Relancer avec logs" -ForegroundColor White
    Write-Host "[K] Tuer processus" -ForegroundColor White
    Write-Host "[L] Voir logs complets" -ForegroundColor White
    Write-Host "[Q] Quitter" -ForegroundColor White
    
    # Input utilisateur
    $input = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    switch ($input.Character) {
        'r' { 
            Write-Host "`n🚀 Relancement avec logs..." -ForegroundColor Green
            Start-Process ".\dist-electron\win-unpacked\Atelier Velo+.exe" -ArgumentList "--enable-logging --log-level=debug"
            Start-Sleep 2
        }
        'k' { 
            Write-Host "`n💀 Arrêt processus..." -ForegroundColor Yellow
            Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" } | Stop-Process -Force
            Get-Process | Where-Object { $_.ProcessName -like "*electron*" } | Stop-Process -Force
        }
        'l' { 
            Write-Host "`n📄 Logs complets:" -ForegroundColor Green
            foreach ($logPath in $logPaths) {
                if (Test-Path $logPath) {
                    Write-Host "`n--- $logPath ---" -ForegroundColor Cyan
                    Get-Content $logPath | Select-Object -Last 50
                }
            }
            Read-Host "Appuyez sur Entrée pour continuer"
        }
        'q' { 
            Write-Host "`nAu revoir!" -ForegroundColor Green
            break
        }
    }
    
    Start-Sleep 2
}
