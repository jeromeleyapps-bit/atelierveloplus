# Script pour réinitialiser le mot de passe PostgreSQL
Write-Host "=== Réinitialisation mot de passe PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$pgHbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"

# Étape 1 : Sauvegarder pg_hba.conf
Write-Host "1. Sauvegarde de pg_hba.conf..." -ForegroundColor Yellow
$backupPath = "$pgHbaPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $pgHbaPath $backupPath
Write-Host "   Sauvegarde: $backupPath" -ForegroundColor Green

# Étape 2 : Modifier temporairement en trust
Write-Host ""
Write-Host "2. Modification temporaire en mode 'trust'..." -ForegroundColor Yellow
$content = Get-Content $pgHbaPath
$newContent = $content -replace 'scram-sha-256', 'trust'
$newContent | Set-Content $pgHbaPath
Write-Host "   Mode trust active" -ForegroundColor Green

# Étape 3 : Redémarrer PostgreSQL
Write-Host ""
Write-Host "3. Redemarrage PostgreSQL..." -ForegroundColor Yellow
try {
    Restart-Service -Name "postgresql-x64-18" -Force
    Start-Sleep -Seconds 3
    Write-Host "   Service redémarre" -ForegroundColor Green
} catch {
    Write-Host "   Erreur redemarrage. Faites-le manuellement:" -ForegroundColor Red
    Write-Host "   services.msc -> postgresql-x64-18 -> Redemarrer" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Appuyez sur Entree apres avoir redémarre le service"
}

# Étape 4 : Demander le nouveau mot de passe
Write-Host ""
Write-Host "4. Definition du nouveau mot de passe..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Choisissez un mot de passe fort (min 12 caracteres)" -ForegroundColor Yellow
Write-Host "Exemple: AtelierVelo2025!Secure#DB" -ForegroundColor Gray
Write-Host ""

$password = Read-Host "Entrez le nouveau mot de passe pour 'postgres'"

if ($password.Length -lt 8) {
    Write-Host ""
    Write-Host "Erreur: Le mot de passe doit contenir au moins 8 caracteres" -ForegroundColor Red
    exit 1
}

# Étape 5 : Changer le mot de passe (sans mot de passe requis car en mode trust)
Write-Host ""
Write-Host "5. Changement du mot de passe..." -ForegroundColor Yellow
& $psqlPath -U postgres -d postgres -c "ALTER USER postgres PASSWORD '$password';"

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Mot de passe change avec succes !" -ForegroundColor Green
} else {
    Write-Host "   Erreur lors du changement" -ForegroundColor Red
    exit 1
}

# Étape 6 : Restaurer scram-sha-256
Write-Host ""
Write-Host "6. Restauration du mode securise..." -ForegroundColor Yellow
$content = Get-Content $pgHbaPath
$newContent = $content -replace 'trust', 'scram-sha-256'
$newContent | Set-Content $pgHbaPath
Write-Host "   Mode scram-sha-256 restaure" -ForegroundColor Green

# Étape 7 : Redémarrer à nouveau
Write-Host ""
Write-Host "7. Redemarrage final..." -ForegroundColor Yellow
try {
    Restart-Service -Name "postgresql-x64-18" -Force
    Start-Sleep -Seconds 3
    Write-Host "   Service redémarre" -ForegroundColor Green
} catch {
    Write-Host "   Erreur. Redemarrez manuellement:" -ForegroundColor Red
    Write-Host "   services.msc -> postgresql-x64-18 -> Redemarrer" -ForegroundColor Gray
}

# Étape 8 : Créer/Mettre à jour .env.local
Write-Host ""
Write-Host "8. Mise a jour de .env.local..." -ForegroundColor Yellow

$envPath = ".env.local"
$envContent = @"
# PostgreSQL Local (Securise)
DATABASE_URL="postgresql://postgres:$password@localhost:5432/atelier_velo?schema=public"

# HubSpot
HUBSPOT_ACCESS_TOKEN=your-hubspot-token
"@

$envContent | Set-Content $envPath
Write-Host "   .env.local mis a jour" -ForegroundColor Green

# Étape 9 : Tester la connexion
Write-Host ""
Write-Host "9. Test de connexion..." -ForegroundColor Yellow
$env:PGPASSWORD = $password
& $psqlPath -U postgres -d atelier_velo -c "SELECT COUNT(*) FROM \"Customer\";" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Connexion reussie !" -ForegroundColor Green
} else {
    Write-Host "   Erreur de connexion. Verifiez le mot de passe." -ForegroundColor Red
}

# Résumé
Write-Host ""
Write-Host "=== TERMINÉ ===" -ForegroundColor Green
Write-Host ""
Write-Host "Mot de passe PostgreSQL: $password" -ForegroundColor Cyan
Write-Host "Fichier .env.local: MIS A JOUR" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Sauvegardez ce mot de passe dans un endroit sur !" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prochaine etape:" -ForegroundColor Cyan
Write-Host "1. Arretez le serveur Next.js (Ctrl+C)" -ForegroundColor White
Write-Host "2. Relancez: npm run dev" -ForegroundColor White
Write-Host "3. Rafraichissez le navigateur" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
