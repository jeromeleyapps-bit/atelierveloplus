# Nettoyage Branches GitHub
# Date: 22 novembre 2025

Write-Host "`n=== NETTOYAGE BRANCHES GITHUB ===" -ForegroundColor Cyan

# 1. Lister branches locales
Write-Host "`n1. Branches locales:" -ForegroundColor Yellow
git branch

# 2. Lister branches distantes
Write-Host "`n2. Branches distantes:" -ForegroundColor Yellow
git branch -r

# 3. Fetch et prune
Write-Host "`n3. Nettoyage branches supprimees sur GitHub..." -ForegroundColor Yellow
git fetch --prune

# 4. Branche actuelle
Write-Host "`n4. Branche actuelle:" -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "   $currentBranch" -ForegroundColor Green

Write-Host "`n=== ANALYSE TERMINEE ===" -ForegroundColor Green
Write-Host "`nBranches a potentiellement supprimer:" -ForegroundColor Cyan
Write-Host "  - Branches de test/debug temporaires" -ForegroundColor White
Write-Host "  - Branches mergees dans main" -ForegroundColor White
Write-Host "`nCommande pour supprimer branche locale:" -ForegroundColor Cyan
Write-Host "  git branch -d <nom-branche>" -ForegroundColor White
Write-Host "`nCommande pour supprimer branche distante:" -ForegroundColor Cyan
Write-Host "  git push origin --delete <nom-branche>" -ForegroundColor White

