# Debug Simple - Electron Logs
Write-Host "=== DEBUG ELECTRON ===" -ForegroundColor Green

# Arrêter processus
Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Nettoyer logs
$logDir = "$env:APPDATA\Atelier Velo+\logs"
if (Test-Path $logDir) {
    Remove-Item "$logDir\*.log" -Force -ErrorAction SilentlyContinue
}

# Lancer avec debug
Write-Host "Lancement Electron..." -ForegroundColor Yellow
$process = Start-Process -FilePath ".\dist-electron\win-unpacked\Atelier Velo+.exe" -ArgumentList "--enable-logging --log-level=debug" -PassThru

Write-Host "PID: $($process.Id)" -ForegroundColor Cyan
Write-Host "Surveillance 30 secondes..." -ForegroundColor Yellow

# Surveillance
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    
    # Chercher logs
    $logPath = "$env:APPDATA\Atelier Velo+\logs\main.log"
    if (Test-Path $logPath) {
        Write-Host "`nLogs trouves!" -ForegroundColor Green
        $logs = Get-Content $logPath -Tail 20
        
        foreach ($line in $logs) {
            if ($line -match "error") {
                Write-Host "ERROR: $line" -ForegroundColor Red
            } elseif ($line -match "warn") {
                Write-Host "WARN: $line" -ForegroundColor Yellow
            } else {
                Write-Host "LOG: $line" -ForegroundColor Gray
            }
        }
        break
    }
    
    # Verifier processus
    if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
        Write-Host "Processus termine" -ForegroundColor Red
        break
    }
    
    Write-Host "Recherche logs... ($i/30)" -ForegroundColor Gray
}

Write-Host "Debug termine" -ForegroundColor Green
