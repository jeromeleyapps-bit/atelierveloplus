# Script de démarrage : Next.js + Cloudflare Tunnel
# Usage: .\start-with-tunnel.ps1

Write-Host "🚀 Démarrage Atelier Vélo+ avec Cloudflare Tunnel..." -ForegroundColor Green

# Vérifier que cloudflared existe
if (-not (Test-Path "C:\cloudflared\cloudflared.exe")) {
    Write-Host "❌ cloudflared.exe introuvable dans C:\cloudflared\" -ForegroundColor Red
    Write-Host "   Installez cloudflared d'abord !" -ForegroundColor Yellow
    exit 1
}

# Vérifier que le config existe
if (-not (Test-Path "C:\cloudflared\config.yml")) {
    Write-Host "❌ config.yml introuvable dans C:\cloudflared\" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Démarrage Next.js..." -ForegroundColor Cyan

# Démarrer Next.js en arrière-plan
$nextJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\j_ley\Atelier-velo+\apps\web"
    pnpm dev
}

Write-Host "✅ Next.js démarré (Job ID: $($nextJob.Id))" -ForegroundColor Green

# Attendre que Next.js soit prêt
Write-Host "⏳ Attente du démarrage de Next.js..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Vérifier que Next.js écoute sur le port 3000
$listening = $false
for ($i = 0; $i -lt 10; $i++) {
    $port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port) {
        $listening = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $listening) {
    Write-Host "⚠️  Next.js ne répond pas sur le port 3000" -ForegroundColor Yellow
    Write-Host "   Continuons quand même..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Démarrage Cloudflare Tunnel..." -ForegroundColor Cyan

# Démarrer Cloudflare Tunnel en arrière-plan
$tunnelJob = Start-Job -ScriptBlock {
    Set-Location "C:\cloudflared"
    .\cloudflared.exe tunnel --config C:\cloudflared\config.yml run atelier-velo
}

Write-Host "✅ Cloudflare Tunnel démarré (Job ID: $($tunnelJob.Id))" -ForegroundColor Green

# Attendre que le tunnel soit connecté
Write-Host "⏳ Connexion au tunnel Cloudflare..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ APPLICATION DÉMARRÉE AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs d'accès :" -ForegroundColor Cyan
Write-Host "   Local:    http://localhost:3000" -ForegroundColor White
Write-Host "   Public:   https://rdv.upgradedbikes.com/booking-local" -ForegroundColor White
Write-Host ""
Write-Host "📊 Jobs en cours :" -ForegroundColor Cyan
Write-Host "   Next.js:  Job ID $($nextJob.Id)" -ForegroundColor White
Write-Host "   Tunnel:   Job ID $($tunnelJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Commandes utiles :" -ForegroundColor Cyan
Write-Host "   Voir les logs Next.js:  Receive-Job $($nextJob.Id)" -ForegroundColor White
Write-Host "   Voir les logs Tunnel:   Receive-Job $($tunnelJob.Id)" -ForegroundColor White
Write-Host "   Arrêter tout:           Appuyez sur Ctrl+C" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

# Afficher les logs en temps réel
Write-Host ""
Write-Host "📜 Logs en temps réel (Ctrl+C pour arrêter) :" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        # Afficher les nouveaux logs de Next.js
        $nextLogs = Receive-Job $nextJob.Id
        if ($nextLogs) {
            Write-Host "[Next.js] $nextLogs" -ForegroundColor Blue
        }

        # Afficher les nouveaux logs du Tunnel
        $tunnelLogs = Receive-Job $tunnelJob.Id
        if ($tunnelLogs) {
            Write-Host "[Tunnel] $tunnelLogs" -ForegroundColor Magenta
        }

        Start-Sleep -Seconds 1
    }
}
finally {
    # Nettoyage à l'arrêt (Ctrl+C)
    Write-Host ""
    Write-Host "🛑 Arrêt des services..." -ForegroundColor Yellow
    
    Stop-Job $nextJob.Id -ErrorAction SilentlyContinue
    Stop-Job $tunnelJob.Id -ErrorAction SilentlyContinue
    
    Remove-Job $nextJob.Id -Force -ErrorAction SilentlyContinue
    Remove-Job $tunnelJob.Id -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Services arrêtés" -ForegroundColor Green
}
