# Script d'installation du scanner de code-barres
# Usage: .\install-barcode-scanner.ps1

Write-Host "Installation du scanner de code-barres..." -ForegroundColor Cyan
Write-Host ""

# Verifier qu'on est dans le bon dossier
if (-not (Test-Path "package.json")) {
    Write-Host "Erreur: Ce script doit etre execute depuis le dossier apps/web" -ForegroundColor Red
    exit 1
}

# Nettoyer le cache npm si necessaire
Write-Host "Nettoyage du cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null

# Verifier si le package est deja installe
Write-Host "Verification de l'installation existante..." -ForegroundColor Yellow
$installed = npm list @zxing/browser 2>&1 | Select-String "@zxing/browser"

if ($installed) {
    Write-Host "@zxing/browser est deja installe" -ForegroundColor Green
    Write-Host $installed -ForegroundColor Gray
} else {
    Write-Host "Installation de @zxing/browser..." -ForegroundColor Yellow
    
    # Tenter l'installation
    npm install @zxing/browser@^0.1.5
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Installation reussie!" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de l'installation" -ForegroundColor Red
        Write-Host ""
        Write-Host "Solutions possibles:" -ForegroundColor Yellow
        Write-Host "1. Supprimer node_modules et reinstaller:" -ForegroundColor White
        Write-Host "   Remove-Item -Recurse -Force node_modules" -ForegroundColor Gray
        Write-Host "   npm install" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Verifier votre connexion internet" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Essayer avec yarn:" -ForegroundColor White
        Write-Host "   yarn add @zxing/browser@^0.1.5" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""
Write-Host "Configuration terminee!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Cyan
Write-Host "1. Demarrer l'application: npm run dev:tunnel" -ForegroundColor White
Write-Host "2. Ouvrir sur smartphone: https://rdv.upgradedbikes.com/admin/catalog" -ForegroundColor White
Write-Host "3. Cliquer sur le bouton 'Scanner'" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- Guide rapide: README_SCANNER.md" -ForegroundColor White
Write-Host "- Documentation complete: SCANNER_CODE_BARRES.md" -ForegroundColor White
Write-Host ""
