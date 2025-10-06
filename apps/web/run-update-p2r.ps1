# Script pour mettre a jour le type de connecteur P2R
Write-Host "=== Mise a jour Connecteur P2R ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    Write-Host "Erreur: psql non trouve" -ForegroundColor Red
    Write-Host "Veuillez ajuster le chemin dans le script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Execution du script SQL..." -ForegroundColor Cyan
Write-Host ""

$env:PAGER = "more"

& $psqlPath -U postgres -d atelier_velo -f update-p2r-connector.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Connecteur P2R mis a jour avec succes !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines etapes :" -ForegroundColor Cyan
    Write-Host "1. Configurer les credentials P2R sur http://localhost:3000/suppliers" -ForegroundColor White
    Write-Host "2. Tester la recherche B2B sur http://localhost:3000/catalog" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Erreur lors de la mise a jour" -ForegroundColor Red
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
