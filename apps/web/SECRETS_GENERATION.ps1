# Script PowerShell pour générer des secrets sécurisés
# Usage: .\SECRETS_GENERATION.ps1

Write-Host "🔐 Génération de secrets sécurisés pour Atelier Vélo+" -ForegroundColor Cyan
Write-Host ""

# Fonction pour générer un secret
function New-Secret {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Générer les secrets
$nextAuthSecret = New-Secret
$authSecret = New-Secret

Write-Host "✅ Secrets générés avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "Copiez ces lignes dans votre fichier .env :" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Secrets d'authentification (NE JAMAIS COMMITER)" -ForegroundColor Gray
Write-Host "NEXTAUTH_SECRET=$nextAuthSecret" -ForegroundColor White
Write-Host "AUTH_SECRET=$authSecret" -ForegroundColor White
Write-Host "NEXTAUTH_URL=http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT :" -ForegroundColor Red
Write-Host "- Ne JAMAIS commiter ces secrets dans Git" -ForegroundColor Red
Write-Host "- Utiliser des secrets différents en production" -ForegroundColor Red
Write-Host "- Les stocker de manière sécurisée (Vercel Secrets)" -ForegroundColor Red
Write-Host ""
Write-Host "📋 Pour ajouter à .env :" -ForegroundColor Cyan
Write-Host "1. Ouvrir apps/web/.env" -ForegroundColor White
Write-Host "2. Ajouter/remplacer les lignes ci-dessus" -ForegroundColor White
Write-Host "3. Redémarrer le serveur : pnpm dev" -ForegroundColor White
Write-Host ""
