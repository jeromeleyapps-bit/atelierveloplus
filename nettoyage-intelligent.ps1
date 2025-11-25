# Nettoyage Intelligent Branches
# Date: 22 novembre 2025
# Strategie: Preserver Windows actuel + macOS futur

$ErrorActionPreference = "Stop"

Write-Host "`n=== NETTOYAGE INTELLIGENT BRANCHES ===" -ForegroundColor Cyan
Write-Host "Strategie: Windows actuel + macOS futur separes`n" -ForegroundColor Yellow

# ============================================================================
# ETAPE 1: ANALYSE BRANCHES
# ============================================================================
Write-Host "1. ANALYSE BRANCHES" -ForegroundColor Green
Write-Host "   ==================`n" -ForegroundColor Green

# Branches locales
Write-Host "Branches locales:" -ForegroundColor Yellow
$localBranches = git branch | ForEach-Object { $_.Trim('* ') }
$localBranches | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

# Branche actuelle
$currentBranch = git branch --show-current
Write-Host "`nBranche actuelle: $currentBranch" -ForegroundColor Cyan

# Branches mergees dans main
Write-Host "`nBranches mergees dans main:" -ForegroundColor Yellow
$mergedBranches = git branch --merged main | ForEach-Object { $_.Trim('* ') } | Where-Object { $_ -ne 'main' -and $_ -ne $currentBranch }
if ($mergedBranches) {
    $mergedBranches | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
} else {
    Write-Host "  (aucune)" -ForegroundColor Gray
}

# ============================================================================
# ETAPE 2: CATEGORISATION
# ============================================================================
Write-Host "`n2. CATEGORISATION" -ForegroundColor Green
Write-Host "   ===============`n" -ForegroundColor Green

# Branches a GARDER (Windows)
$keepWindows = @('main', 'fix/macos-build')
Write-Host "GARDER - Windows (dossier actuel):" -ForegroundColor Green
$keepWindows | ForEach-Object { 
    if ($localBranches -contains $_) {
        Write-Host "  + $_" -ForegroundColor Green
    }
}

# Branches a GARDER (macOS futur)
$keepMacOS = @('macos-workflow-only', 'refactor/flat-structure')
Write-Host "`nGARDER - macOS (futur dossier separe):" -ForegroundColor Cyan
$keepMacOS | ForEach-Object { 
    if ($localBranches -contains $_) {
        Write-Host "  + $_" -ForegroundColor Cyan
    }
}

# Branches candidates a suppression
$keepAll = $keepWindows + $keepMacOS + @($currentBranch)
$candidatesDelete = $localBranches | Where-Object { $_ -notin $keepAll }

Write-Host "`nCANDIDATES SUPPRESSION (backup/test temporaires):" -ForegroundColor Yellow
if ($candidatesDelete) {
    $candidatesDelete | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
} else {
    Write-Host "  (aucune)" -ForegroundColor Gray
}

# ============================================================================
# ETAPE 3: VERIFICATION BRANCHES MERGEES
# ============================================================================
Write-Host "`n3. VERIFICATION BRANCHES MERGEES" -ForegroundColor Green
Write-Host "   ==============================`n" -ForegroundColor Green

$safeToDelete = @()
foreach ($branch in $candidatesDelete) {
    # Verifier si mergee dans main
    $isMerged = git branch --merged main | ForEach-Object { $_.Trim('* ') } | Where-Object { $_ -eq $branch }
    
    if ($isMerged) {
        Write-Host "  OK: $branch (mergee dans main)" -ForegroundColor Green
        $safeToDelete += $branch
    } else {
        # Verifier si commits uniques
        $uniqueCommits = git log main..$branch --oneline 2>$null
        if (-not $uniqueCommits) {
            Write-Host "  OK: $branch (aucun commit unique)" -ForegroundColor Green
            $safeToDelete += $branch
        } else {
            Write-Host "  ATTENTION: $branch (commits non merges)" -ForegroundColor Red
        }
    }
}

# ============================================================================
# ETAPE 4: PROPOSITION SUPPRESSION
# ============================================================================
Write-Host "`n4. PROPOSITION SUPPRESSION" -ForegroundColor Green
Write-Host "   =======================`n" -ForegroundColor Green

if ($safeToDelete.Count -eq 0) {
    Write-Host "Aucune branche a supprimer." -ForegroundColor Gray
    Write-Host "`n=== NETTOYAGE TERMINE ===" -ForegroundColor Green
    exit 0
}

Write-Host "Branches safe a supprimer:" -ForegroundColor Yellow
$safeToDelete | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }

Write-Host "`nVoulez-vous supprimer ces branches? (O/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq 'O' -or $response -eq 'o') {
    Write-Host "`nSuppression en cours..." -ForegroundColor Yellow
    
    foreach ($branch in $safeToDelete) {
        try {
            git branch -d $branch 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  OK: $branch supprimee" -ForegroundColor Green
            } else {
                # Force si necessaire
                git branch -D $branch
                Write-Host "  OK: $branch supprimee (force)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ERREUR: $branch - $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n=== SUPPRESSION TERMINEE ===" -ForegroundColor Green
} else {
    Write-Host "`nSuppression annulee." -ForegroundColor Yellow
}

# ============================================================================
# ETAPE 5: NETTOYAGE REFERENCES DISTANTES
# ============================================================================
Write-Host "`n5. NETTOYAGE REFERENCES DISTANTES" -ForegroundColor Green
Write-Host "   ===============================`n" -ForegroundColor Green

Write-Host "Nettoyage references distantes supprimees..." -ForegroundColor Yellow
git fetch --prune
Write-Host "OK: References nettoyees" -ForegroundColor Green

# ============================================================================
# RESUME
# ============================================================================
Write-Host "`n=== RESUME ===" -ForegroundColor Cyan
Write-Host "`nBranches conservees:" -ForegroundColor Green
Write-Host "  Windows (actuel):" -ForegroundColor Yellow
$keepWindows | ForEach-Object { 
    if ($localBranches -contains $_) {
        Write-Host "    + $_" -ForegroundColor Green
    }
}
Write-Host "  macOS (futur):" -ForegroundColor Yellow
$keepMacOS | ForEach-Object { 
    if ($localBranches -contains $_) {
        Write-Host "    + $_" -ForegroundColor Cyan
    }
}

Write-Host "`nProchaines actions:" -ForegroundColor Cyan
Write-Host "  1. Push corrections Windows: .\push-github.ps1" -ForegroundColor White
Write-Host "  2. Voir strategie complete: STRATEGIE-BRANCHES.md" -ForegroundColor White

Write-Host "`n=== NETTOYAGE TERMINE ===" -ForegroundColor Green

