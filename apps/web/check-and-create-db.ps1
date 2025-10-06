# Script pour vérifier et créer la base de données
Write-Host "=== Vérification Base de Données ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# 1. Lister les bases de données existantes
Write-Host "Bases de données existantes:" -ForegroundColor Yellow
& $psqlPath -U postgres -d postgres -c "\l"

Write-Host ""
Write-Host "Quelle est le nom de votre base de données ?" -ForegroundColor Yellow
Write-Host "Options courantes: atelier_velo, ateliervelo, postgres, atelier" -ForegroundColor Gray
$dbName = Read-Host "Nom de la base (ou 'create' pour créer atelier_velo)"

if ($dbName -eq "create") {
    Write-Host ""
    Write-Host "Création de la base de données 'atelier_velo'..." -ForegroundColor Cyan
    & $psqlPath -U postgres -d postgres -c "CREATE DATABASE atelier_velo;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Base de données 'atelier_velo' créée avec succès !" -ForegroundColor Green
        $dbName = "atelier_velo"
    } else {
        Write-Host "Erreur lors de la création de la base." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Utilisation de la base: $dbName" -ForegroundColor Green
Write-Host ""
Write-Host "Maintenant, exécutez:" -ForegroundColor Cyan
Write-Host ".\run-migration.ps1" -ForegroundColor White
Write-Host "Et entrez '$dbName' comme nom de base de données" -ForegroundColor White
Write-Host ""

Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
