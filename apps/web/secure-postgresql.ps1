# Script de sécurisation PostgreSQL
Write-Host "=== Sécurisation PostgreSQL ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$pgHbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"

# Vérifier que psql existe
if (-not (Test-Path $psqlPath)) {
    Write-Host "Erreur: psql non trouve" -ForegroundColor Red
    exit 1
}

# Étape 1 : Définir un mot de passe
Write-Host "Etape 1: Definition du mot de passe PostgreSQL" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Choisissez un mot de passe fort (min 12 caracteres)" -ForegroundColor Yellow
Write-Host "Exemple: AtelierVelo2025!Secure#DB" -ForegroundColor Gray
Write-Host ""

$password = Read-Host "Entrez le nouveau mot de passe pour l'utilisateur 'postgres'" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

if ($passwordPlain.Length -lt 12) {
    Write-Host "Erreur: Le mot de passe doit contenir au moins 12 caracteres" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Changement du mot de passe..." -ForegroundColor Cyan

& $psqlPath -U postgres -d postgres -c "ALTER USER postgres PASSWORD '$passwordPlain';"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Mot de passe change avec succes !" -ForegroundColor Green
} else {
    Write-Host "Erreur lors du changement de mot de passe" -ForegroundColor Red
    exit 1
}

# Étape 2 : Sauvegarder pg_hba.conf
Write-Host ""
Write-Host "Etape 2: Sauvegarde de pg_hba.conf" -ForegroundColor Yellow

$backupPath = "$pgHbaPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $pgHbaPath $backupPath
Write-Host "Sauvegarde creee: $backupPath" -ForegroundColor Green

# Étape 3 : Modifier pg_hba.conf
Write-Host ""
Write-Host "Etape 3: Modification de pg_hba.conf" -ForegroundColor Yellow
Write-Host "Remplacement de 'trust' par 'scram-sha-256'..." -ForegroundColor Cyan

$content = Get-Content $pgHbaPath
$newContent = $content -replace 'trust', 'scram-sha-256'
$newContent | Set-Content $pgHbaPath

Write-Host "pg_hba.conf modifie avec succes !" -ForegroundColor Green

# Étape 4 : Redémarrer PostgreSQL
Write-Host ""
Write-Host "Etape 4: Redemarrage de PostgreSQL" -ForegroundColor Yellow
Write-Host "Redemarrage du service..." -ForegroundColor Cyan

try {
    Restart-Service -Name "postgresql-x64-18" -Force
    Write-Host "Service redémarre avec succes !" -ForegroundColor Green
} catch {
    Write-Host "Erreur lors du redemarrage. Veuillez redemarrer manuellement:" -ForegroundColor Yellow
    Write-Host "services.msc -> postgresql-x64-18 -> Redemarrer" -ForegroundColor Gray
}

# Étape 5 : Créer .env.local
Write-Host ""
Write-Host "Etape 5: Mise a jour de .env.local" -ForegroundColor Yellow

$envContent = @"
# PostgreSQL Local (Securise)
DATABASE_URL="postgresql://postgres:$passwordPlain@localhost:5432/atelier_velo?schema=public"

# HubSpot
HUBSPOT_ACCESS_TOKEN=your-hubspot-token

# Autres variables...
"@

$envPath = ".env.local"
$envContent | Set-Content $envPath

Write-Host ".env.local cree/mis a jour" -ForegroundColor Green

# Résumé
Write-Host ""
Write-Host "=== SECURISATION TERMINEE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Actions effectuees:" -ForegroundColor Cyan
Write-Host "1. Mot de passe PostgreSQL defini" -ForegroundColor White
Write-Host "2. pg_hba.conf sauvegarde et modifie (trust -> scram-sha-256)" -ForegroundColor White
Write-Host "3. Service PostgreSQL redémarre" -ForegroundColor White
Write-Host "4. .env.local mis a jour" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "- Sauvegardez votre mot de passe dans un gestionnaire securise" -ForegroundColor White
Write-Host "- Ne committez JAMAIS .env.local dans Git" -ForegroundColor White
Write-Host "- Testez la connexion: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
