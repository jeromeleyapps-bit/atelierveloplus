# Script d'arrêt Atelier Vélo+
# Arrête proprement l'application

Write-Host "=== Arrêt Atelier Vélo+ ===" -ForegroundColor Cyan
Write-Host ""

# Trouver et arrêter les processus Node.js liés à Next.js
Write-Host "Recherche des processus Next.js..." -ForegroundColor Yellow
$nextProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Atelier-velo+*"
}

if ($nextProcesses) {
    Write-Host "Arrêt de $($nextProcesses.Count) processus..." -ForegroundColor Yellow
    $nextProcesses | Stop-Process -Force
    Write-Host "✓ Application arrêtée" -ForegroundColor Green
} else {
    Write-Host "Aucun processus en cours" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Terminé ===" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
