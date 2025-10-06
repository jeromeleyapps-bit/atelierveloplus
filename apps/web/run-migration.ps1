# Script PowerShell pour exécuter la migration updatedAt
# Usage: .\run-migration.ps1

Write-Host "=== Migration WorkOrder - Ajout updatedAt ===" -ForegroundColor Cyan
Write-Host ""

# Chemin vers psql
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# Vérifier que psql existe
if (-not (Test-Path $psqlPath)) {
    Write-Host "ERREUR: psql.exe non trouvé à $psqlPath" -ForegroundColor Red
    Write-Host "Veuillez ajuster le chemin dans le script." -ForegroundColor Yellow
    exit 1
}

# Fichier de migration
$migrationFile = "MIGRATION_ADD_UPDATEDAT.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERREUR: Fichier $migrationFile non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier de migration trouvé: $migrationFile" -ForegroundColor Green
Write-Host ""

# Demander les informations de connexion
Write-Host "Informations de connexion PostgreSQL:" -ForegroundColor Yellow
$dbName = Read-Host "Nom de la base de données (défaut: atelier_velo)"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "atelier_velo"
}

$dbUser = Read-Host "Utilisateur (défaut: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) {
    $dbUser = "postgres"
}

Write-Host ""
Write-Host "Connexion à la base '$dbName' avec l'utilisateur '$dbUser'..." -ForegroundColor Cyan
Write-Host "Le mot de passe vous sera demandé." -ForegroundColor Yellow
Write-Host ""

# Exécuter la migration
try {
    & $psqlPath -U $dbUser -d $dbName -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=== Migration réussie ! ===" -ForegroundColor Green
        Write-Host ""
        Write-Host "Prochaines étapes:" -ForegroundColor Cyan
        Write-Host "1. Exécuter: npx prisma generate" -ForegroundColor White
        Write-Host "2. Redémarrer le serveur (Ctrl+C puis npm run dev)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "=== Erreur lors de la migration ===" -ForegroundColor Red
        Write-Host "Vérifiez les messages d'erreur ci-dessus." -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "ERREUR: $_" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
