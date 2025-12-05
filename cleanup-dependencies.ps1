# ============================================================================
# CLEANUP DEPENDENCIES - Atelier Velo+
# ============================================================================
# Date: 5 decembre 2025
# Objectif: Reduire le nombre de fichiers pour eviter ENAMETOOLONG
# Methodologie: AGILE 7 etapes - Etape 3 CORRIGER
# ============================================================================

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "NETTOYAGE DEPENDANCES - ATELIER VELO+" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Verification pre-nettoyage
Write-Host "[1/5] Verification etat actuel..." -ForegroundColor Yellow

$nodeModulesCount = (Get-ChildItem -Path "node_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "  Fichiers node_modules actuels: $nodeModulesCount" -ForegroundColor White

# Liste des dependances a supprimer (confirmees par depcheck)
$unusedDeps = @(
    "@hubspot/api-client",
    "@supabase/supabase-js",
    "@upstash/ratelimit",
    "@upstash/redis",
    "glob-to-regexp",
    "next-electron-server",
    "webpack-hot-middleware"
)

Write-Host ""
Write-Host "[2/5] Suppression des dependances inutilisees..." -ForegroundColor Yellow

foreach ($dep in $unusedDeps) {
    Write-Host "  Suppression: $dep" -ForegroundColor Gray
    npm uninstall $dep --save 2>$null
}

Write-Host ""
Write-Host "[3/5] Nettoyage cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>$null

Write-Host ""
Write-Host "[4/5] Reinstallation propre..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
npm install 2>$null

Write-Host ""
Write-Host "[5/5] Verification post-nettoyage..." -ForegroundColor Yellow

$nodeModulesCountAfter = (Get-ChildItem -Path "node_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$reduction = $nodeModulesCount - $nodeModulesCountAfter
$percentReduction = [math]::Round(($reduction / $nodeModulesCount) * 100, 1)

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "RESULTATS" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""
Write-Host "  Fichiers AVANT:  $nodeModulesCount" -ForegroundColor White
Write-Host "  Fichiers APRES:  $nodeModulesCountAfter" -ForegroundColor White
Write-Host "  Reduction:       $reduction fichiers (-$percentReduction%)" -ForegroundColor Green
Write-Host ""

if ($nodeModulesCountAfter -lt 80000) {
    Write-Host "OK - Reduction significative" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Encore trop de fichiers, appliquer Phase 2" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Prochaine etape: Executer build pour tester" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  npm run postbuild" -ForegroundColor White
Write-Host ""
