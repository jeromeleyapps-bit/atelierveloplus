# Script de démarrage : Next.js + Cloudflare Tunnel
Write-Host "Demarrage Atelier Velo+ avec Cloudflare Tunnel..." -ForegroundColor Green

# Nettoyer les processus existants
Write-Host "Nettoyage des processus existants..." -ForegroundColor Yellow
try {
    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port3000) {
        Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Processus sur port 3000 arrete" -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
} catch {
    # Ignore les erreurs
}

# Vérifier cloudflared
if (-not (Test-Path "C:\cloudflared\cloudflared.exe")) {
    Write-Host "Erreur: cloudflared.exe introuvable" -ForegroundColor Red
    exit 1
}

# Vérifier config
if (-not (Test-Path "C:\cloudflared\config.yml")) {
    Write-Host "Erreur: config.yml introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "Demarrage Next.js..." -ForegroundColor Cyan
$nextJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\j_ley\Atelier-velo+\apps\web"
    pnpm dev
}

Write-Host "Next.js demarre (Job ID: $($nextJob.Id))" -ForegroundColor Green
Start-Sleep -Seconds 5

Write-Host "Demarrage Cloudflare Tunnel..." -ForegroundColor Cyan
$tunnelJob = Start-Job -ScriptBlock {
    Set-Location "C:\cloudflared"
    .\cloudflared.exe tunnel --config C:\cloudflared\config.yml run atelier-velo
}

Write-Host "Tunnel demarre (Job ID: $($tunnelJob.Id))" -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "APPLICATION DEMARREE !" -ForegroundColor Green
Write-Host ""
Write-Host "URLs d'acces :" -ForegroundColor Cyan
Write-Host "  Local:  http://localhost:3000" -ForegroundColor White
Write-Host "  Public: https://rdv.upgradedbikes.com/booking-local" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        $nextLogs = Receive-Job $nextJob.Id
        if ($nextLogs) {
            Write-Host "[Next.js] $nextLogs" -ForegroundColor Blue
        }

        $tunnelLogs = Receive-Job $tunnelJob.Id
        if ($tunnelLogs) {
            Write-Host "[Tunnel] $tunnelLogs" -ForegroundColor Magenta
        }

        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host ""
    Write-Host "Arret des services..." -ForegroundColor Yellow
    
    Stop-Job $nextJob.Id -ErrorAction SilentlyContinue
    Stop-Job $tunnelJob.Id -ErrorAction SilentlyContinue
    
    Remove-Job $nextJob.Id -Force -ErrorAction SilentlyContinue
    Remove-Job $tunnelJob.Id -Force -ErrorAction SilentlyContinue
    
    Write-Host "Services arretes" -ForegroundColor Green
}
