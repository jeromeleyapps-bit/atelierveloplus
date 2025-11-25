# Simple Monitor - Build Electron Temps Réel
Clear-Host

Write-Host "=== MONITOR BUILD ELECTRON ===" -ForegroundColor Green

while ($true) {
    Clear-Host
    Write-Host "=== MONITOR ===" -ForegroundColor Green
    Write-Host "Heure: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow
    
    # Logs Electron
    Write-Host "`nLOGS ELECTRON:" -ForegroundColor Cyan
    $logPath = "$env:APPDATA\Atelier Velo+\logs\main.log"
    if (Test-Path $logPath) {
        $logs = Get-Content $logPath -Tail 15
        foreach ($line in $logs) {
            if ($line -match "error|Error") {
                Write-Host $line -ForegroundColor Red
            } elseif ($line -match "prisma|Prisma") {
                Write-Host $line -ForegroundColor Magenta
            } else {
                Write-Host $line -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "Pas de logs trouves dans: $logPath" -ForegroundColor Red
    }
    
    # Processus
    Write-Host "`nPROCESSUS:" -ForegroundColor Cyan
    $processes = Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" }
    if ($processes.Count -gt 0) {
        foreach ($proc in $processes) {
            Write-Host "PID: $($proc.Id) - $($proc.ProcessName)" -ForegroundColor White
        }
    } else {
        Write-Host "Aucun processus Atelier" -ForegroundColor Yellow
    }
    
    # Actions
    Write-Host "`n[ACTIONS]" -ForegroundColor Cyan
    Write-Host "[R] Relancer avec logs" -ForegroundColor White
    Write-Host "[K] Tuer processus" -ForegroundColor White
    Write-Host "[Q] Quitter" -ForegroundColor White
    
    $userChoice = Read-Host "`nChoix"
    
    switch ($userChoice.ToLower()) {
        'r' {
            Write-Host "Relancement..." -ForegroundColor Green
            Start-Process ".\dist-electron\win-unpacked\Atelier Velo+.exe" -ArgumentList "--enable-logging"
            Start-Sleep 3
        }
        'k' {
            Write-Host "Arret processus..." -ForegroundColor Yellow
            Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" } | Stop-Process -Force
        }
        'q' {
            break
        }
    }
    
    Start-Sleep 2
}
