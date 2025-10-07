# Migration Script - Ajout des informations legales
# Ce script ajoute les champs legaux a la table AppSetting

Write-Host "Migration : Ajout des informations legales" -ForegroundColor Cyan
Write-Host ""

# Verifier que nous sommes dans le bon repertoire
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "ERREUR : Fichier schema.prisma non trouve" -ForegroundColor Red
    Write-Host "   Assurez-vous d'etre dans le dossier apps/web" -ForegroundColor Yellow
    exit 1
}

# Etape 1 : Generer et appliquer la migration
Write-Host "Etape 1/3 : Generation de la migration..." -ForegroundColor Yellow
try {
    npx prisma migrate dev --name add_legal_info_to_app_settings
    Write-Host "OK - Migration generee et appliquee" -ForegroundColor Green
} catch {
    Write-Host "ERREUR lors de la migration" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# Etape 2 : Regenerer le client Prisma
Write-Host "Etape 2/3 : Regeneration du client Prisma..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "OK - Client Prisma regenere" -ForegroundColor Green
} catch {
    Write-Host "ERREUR lors de la generation" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# Etape 3 : Instructions finales
Write-Host "Migration terminee avec succes !" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Cyan
Write-Host "   1. Redemarrez le serveur : npm run dev" -ForegroundColor White
Write-Host "   2. Allez sur /settings" -ForegroundColor White
Write-Host "   3. Remplissez les informations legales" -ForegroundColor White
Write-Host "   4. Testez un export PDF" -ForegroundColor White
Write-Host ""
Write-Host "Les informations du profil utilisateur seront maintenant utilisees dans les PDF" -ForegroundColor Yellow
