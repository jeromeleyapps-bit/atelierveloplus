# Script pour mettre a jour les secrets dans .env
# Usage: .\update-secrets.ps1

Write-Host "Mise a jour des secrets dans .env..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "ERROR: Fichier .env introuvable!" -ForegroundColor Red
    exit 1
}

# Nouveaux secrets generes
$newNextAuthSecret = "7K9mP2xR8vN4qW6tY3jH5nL1cF8dS0aZ9bV7eM4kX2pQ6wR3yT5uI8oA1sD4fG7h"
$newAuthSecret = "3nB8vM2kL9xC5qW1tY7jP4rH6eN0aS8dF2gK5zX9bV3mQ1wR7yT4uI6oA8sD2fG5h"

# Lire le contenu
$content = Get-Content .env -Raw

# Remplacer les secrets
$content = $content -replace 'NEXTAUTH_SECRET=.*', "NEXTAUTH_SECRET=$newNextAuthSecret"
$content = $content -replace 'AUTH_SECRET=.*', "AUTH_SECRET=$newAuthSecret"

# Ecrire le fichier
Set-Content -Path .env -Value $content -NoNewline

Write-Host "OK: Secrets mis a jour!" -ForegroundColor Green
Write-Host ""
Write-Host "Nouveaux secrets:" -ForegroundColor Cyan
Write-Host "  NEXTAUTH_SECRET: $newNextAuthSecret" -ForegroundColor Gray
Write-Host "  AUTH_SECRET: $newAuthSecret" -ForegroundColor Gray
Write-Host ""
Write-Host "Redemarrez l'application: npm run dev" -ForegroundColor Yellow
