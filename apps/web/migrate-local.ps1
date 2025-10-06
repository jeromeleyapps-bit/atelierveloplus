# Script pour forcer l'utilisation de PostgreSQL local
Write-Host "=== Migration Prisma - PostgreSQL Local ===" -ForegroundColor Cyan
Write-Host ""

# Définir DATABASE_URL pour cette session
$env:DATABASE_URL = "postgresql://postgres@localhost:5432/atelier_velo?schema=public"

Write-Host "DATABASE_URL configuré pour PostgreSQL local" -ForegroundColor Green
Write-Host "Base: atelier_velo @ localhost:5432" -ForegroundColor Gray
Write-Host ""

# Appliquer les migrations
Write-Host "Application des migrations Prisma..." -ForegroundColor Cyan
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Migrations Prisma appliquées avec succès ! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaine étape:" -ForegroundColor Cyan
    Write-Host ".\run-migration.ps1" -ForegroundColor White
    Write-Host "(Entrer 'atelier_velo' comme nom de base)" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "=== Erreur lors des migrations ===" -ForegroundColor Red
    Write-Host "Vérifiez les messages ci-dessus." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
