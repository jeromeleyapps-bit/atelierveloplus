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

# Vérifier cloudflared (chercher dans les 2 emplacements possibles)
$cloudflaredPath = ""
if (Test-Path "C:\cloudflared\cloudflared.exe") {
    $cloudflaredPath = "C:\cloudflared\cloudflared.exe"
    $configPath = "C:\cloudflared\config.yml"
} elseif (Test-Path "$env:USERPROFILE\.cloudflared\cloudflared.exe") {
    $cloudflaredPath = "$env:USERPROFILE\.cloudflared\cloudflared.exe"
    $configPath = "$env:USERPROFILE\.cloudflared\config.yml"
} else {
    Write-Host "Erreur: cloudflared.exe introuvable" -ForegroundColor Red
    Write-Host "Cherche dans: C:\cloudflared\ ou $env:USERPROFILE\.cloudflared\" -ForegroundColor Yellow
    exit 1
}

# Vérifier config
if (-not (Test-Path $configPath)) {
    Write-Host "Erreur: config.yml introuvable dans $configPath" -ForegroundColor Red
    exit 1
}

Write-Host "Utilisation de cloudflared: $cloudflaredPath" -ForegroundColor Green
Write-Host "Configuration: $configPath" -ForegroundColor Green

Write-Host "Demarrage Next.js (sans WebSocket HMR)..." -ForegroundColor Cyan
$nextJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\j_ley\Atelier-velo+\apps\web"
    # Désactiver le WebSocket HMR pour éviter les erreurs avec Cloudflare Tunnel
    $env:NEXT_TELEMETRY_DISABLED = "1"
    $env:WATCHPACK_POLLING = "true"
    $env:FAST_REFRESH = "false"
    $env:__NEXT_DISABLE_WEBSOCKET = "1"
    pnpm dev
}

Write-Host "Next.js demarre (Job ID: $($nextJob.Id))" -ForegroundColor Green
Start-Sleep -Seconds 5

Write-Host "Demarrage Cloudflare Tunnel (logs filtres)..." -ForegroundColor Cyan
$tunnelJob = Start-Job -ArgumentList $cloudflaredPath, $configPath -ScriptBlock {
    param($cfPath, $cfConfig)
    $dir = Split-Path $cfPath
    Set-Location $dir
    # Filtrer les erreurs webpack-hmr qui sont normales en dev
    & $cfPath tunnel --config $cfConfig run 2>&1 | 
        Where-Object { $_ -notmatch 'webpack-hmr' -and $_ -notmatch 'Unauthorized.*_next' }
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
