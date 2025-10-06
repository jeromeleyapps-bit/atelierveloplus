# Script pour changer le mot de passe PostgreSQL
Write-Host "=== Changement du mot de passe PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# Nouveau mot de passe (sans caractères spéciaux problématiques)
$newPassword = "AtelierVelo2025Secure"
$oldPassword = "D@rkfarmer1973@1979"

Write-Host "Ancien mot de passe: D@rkfarmer1973@1979" -ForegroundColor Yellow
Write-Host "Nouveau mot de passe: $newPassword" -ForegroundColor Green
Write-Host ""

# Étape 1 : Changer le mot de passe
Write-Host "1. Changement du mot de passe..." -ForegroundColor Yellow
$env:PGPASSWORD = $oldPassword
& $psqlPath -U postgres -d postgres -c "ALTER USER postgres PASSWORD '$newPassword';"

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Mot de passe changé avec succès !" -ForegroundColor Green
} else {
    Write-Host "   Erreur lors du changement" -ForegroundColor Red
    Write-Host ""
    Write-Host "Si l'ancien mot de passe ne fonctionne pas, utilisez reset-postgres-password.ps1" -ForegroundColor Yellow
    exit 1
}

# Étape 2 : Tester la connexion avec le nouveau mot de passe
Write-Host ""
Write-Host "2. Test de connexion avec le nouveau mot de passe..." -ForegroundColor Yellow
$env:PGPASSWORD = $newPassword
& $psqlPath -U postgres -d atelier_velo -c "SELECT COUNT(*) FROM \"Customer\";" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Connexion réussie !" -ForegroundColor Green
} else {
    Write-Host "   Erreur de connexion" -ForegroundColor Red
    exit 1
}

# Étape 3 : Mettre à jour .env.local
Write-Host ""
Write-Host "3. Mise à jour de .env.local..." -ForegroundColor Yellow

$envContent = @"
# PostgreSQL Local (Securise)
DATABASE_URL="postgresql://postgres:$newPassword@localhost:5432/atelier_velo?schema=public"

# HubSpot
HUBSPOT_ACCESS_TOKEN=your-hubspot-token
"@

[System.IO.File]::WriteAllText("$PWD\.env.local", $envContent, [System.Text.Encoding]::UTF8)
Write-Host "   .env.local mis à jour" -ForegroundColor Green

# Résumé
Write-Host ""
Write-Host "=== TERMINÉ ===" -ForegroundColor Green
Write-Host ""
Write-Host "Nouveau mot de passe PostgreSQL: $newPassword" -ForegroundColor Cyan
Write-Host "Fichier .env.local: MIS À JOUR" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Sauvegardez ce mot de passe dans un endroit sûr !" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Arrêtez le serveur Next.js (Ctrl+C)" -ForegroundColor White
Write-Host "2. Relancez: npm run dev" -ForegroundColor White
Write-Host "3. Rafraîchissez le navigateur" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
