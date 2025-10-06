# Script pour nettoyer les donnees fournisseurs
Write-Host "=== Nettoyage Donnees Fournisseurs ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    Write-Host "Erreur: psql non trouve" -ForegroundColor Red
    exit 1
}

Write-Host "ATTENTION: Ce script va supprimer TOUTES les donnees fournisseurs:" -ForegroundColor Yellow
Write-Host "- Tous les fournisseurs" -ForegroundColor Gray
Write-Host "- Tous les credentials" -ForegroundColor Gray
Write-Host "- Toutes les offres en cache" -ForegroundColor Gray
Write-Host "- Tous les items fournisseurs" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Voulez-vous continuer? (o/n)"
if ($confirm -ne "o") {
    Write-Host "Annule." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Execution du nettoyage..." -ForegroundColor Cyan
Write-Host ""

$env:PAGER = "more"

& $psqlPath -U postgres -d atelier_velo -f clean-suppliers.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Nettoyage termine avec succes !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Base de donnees prete pour les vraies API" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Prochaines etapes:" -ForegroundColor Cyan
    Write-Host "1. Obtenir les API des fournisseurs" -ForegroundColor White
    Write-Host "2. Creer les nouveaux fournisseurs avec les bons connecteurs" -ForegroundColor White
    Write-Host "3. Configurer les API keys" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Erreur lors du nettoyage" -ForegroundColor Red
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
