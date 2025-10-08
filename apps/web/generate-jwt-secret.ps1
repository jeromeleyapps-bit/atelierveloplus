# Script de generation de JWT_SECRET securise
# Usage: powershell -ExecutionPolicy Bypass -File generate-jwt-secret.ps1

Write-Host "`nGeneration d'un JWT_SECRET securise...`n" -ForegroundColor Cyan

# Generer 64 caracteres aleatoires (lettres + chiffres)
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host "Secret genere !`n" -ForegroundColor Green
Write-Host "Ajouter cette ligne dans votre fichier .env.local :" -ForegroundColor Yellow
Write-Host ""
Write-Host "JWT_SECRET=$secret" -ForegroundColor White -BackgroundColor DarkGray
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Red
Write-Host "   - Ne JAMAIS commiter ce secret dans Git" -ForegroundColor White
Write-Host "   - Garder .env.local dans .gitignore" -ForegroundColor White
Write-Host "   - Utiliser un secret different en production`n" -ForegroundColor White
