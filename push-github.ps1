# Push vers GitHub
# Date: 22 novembre 2025

Write-Host "`n=== PUSH VERS GITHUB ===" -ForegroundColor Cyan

# 1. Verifier branche actuelle
$currentBranch = git branch --show-current
Write-Host "`nBranche actuelle: $currentBranch" -ForegroundColor Yellow

# 2. Verifier commits a pusher
Write-Host "`nCommits a pusher:" -ForegroundColor Yellow
git log origin/$currentBranch..$currentBranch --oneline 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Nouvelle branche ou pas encore trackee" -ForegroundColor Cyan
}

# 3. Push
Write-Host "`nPush vers origin/$currentBranch..." -ForegroundColor Yellow
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== PUSH REUSSI ===" -ForegroundColor Green
} else {
    Write-Host "`n=== ERREUR PUSH ===" -ForegroundColor Red
    Write-Host "Commande manuelle:" -ForegroundColor Cyan
    Write-Host "  git push -u origin $currentBranch" -ForegroundColor White
}

