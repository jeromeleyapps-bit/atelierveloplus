# Script pour réinitialiser et migrer vers PostgreSQL
Write-Host "=== Réinitialisation Migrations - PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

# Définir DATABASE_URL pour PostgreSQL local
$env:DATABASE_URL = "postgresql://postgres@localhost:5432/atelier_velo?schema=public"

Write-Host "ATTENTION: Ce script va:" -ForegroundColor Yellow
Write-Host "1. Supprimer le dossier prisma/migrations" -ForegroundColor Gray
Write-Host "2. Synchroniser le schéma avec la base de données" -ForegroundColor Gray
Write-Host "3. Créer toutes les tables" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Continuer? (o/n)"
if ($confirm -ne "o") {
    Write-Host "Annulé." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Suppression de l'ancien dossier migrations..." -ForegroundColor Cyan
Remove-Item -Path "prisma\migrations" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Synchronisation du schéma avec PostgreSQL..." -ForegroundColor Cyan
npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Base de données synchronisée avec succès ! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Toutes les tables ont été créées dans PostgreSQL." -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "1. .\run-migration.ps1 (pour ajouter updatedAt)" -ForegroundColor White
    Write-Host "2. npx prisma generate" -ForegroundColor White
    Write-Host "3. Redémarrer le serveur (Ctrl+C puis npm run dev)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=== Erreur lors de la synchronisation ===" -ForegroundColor Red
    Write-Host "Vérifiez les messages ci-dessus." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
