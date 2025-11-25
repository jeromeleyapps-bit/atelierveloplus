# Organisation Sauvegardes - 22 novembre 2025
# Objectif: Sauvegarder branches backup avant suppression

$ErrorActionPreference = "Stop"

Write-Host "`n=== ORGANISATION SAUVEGARDES ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n" -ForegroundColor Yellow

# ============================================================================
# ETAPE 1: IDENTIFIER BRANCHES BACKUP
# ============================================================================
Write-Host "1. IDENTIFICATION BRANCHES BACKUP" -ForegroundColor Green
Write-Host "   ==============================`n" -ForegroundColor Green

$backupBranches = @(
    'backup-2025-10-26',
    'backup-clean-2025-10-26',
    'backup-source-2025-10-26',
    'backup-typescript-fixes-20251121-123644',
    'release/v1.0.0'
)

Write-Host "Branches backup identifiees:" -ForegroundColor Yellow
$backupBranches | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

# ============================================================================
# ETAPE 2: CREER TAGS POUR SAUVEGARDES
# ============================================================================
Write-Host "`n2. CREATION TAGS SAUVEGARDE" -ForegroundColor Green
Write-Host "   =========================`n" -ForegroundColor Green

Write-Host "Creation tags pour preserver historique..." -ForegroundColor Yellow

foreach ($branch in $backupBranches) {
    # Verifier si branche existe
    $branchExists = git branch --list $branch
    if (-not $branchExists) {
        Write-Host "  SKIP: $branch (n'existe pas)" -ForegroundColor Gray
        continue
    }
    
    # Creer tag avec date
    $tagName = "archive/$branch-$(Get-Date -Format 'yyyyMMdd')"
    
    try {
        git tag -a $tagName $branch -m "Archive branche $branch - $(Get-Date -Format 'yyyy-MM-dd')"
        Write-Host "  OK: Tag cree - $tagName" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR: $branch - $_" -ForegroundColor Red
    }
}

# ============================================================================
# ETAPE 3: PUSH TAGS VERS GITHUB
# ============================================================================
Write-Host "`n3. PUSH TAGS VERS GITHUB" -ForegroundColor Green
Write-Host "   =====================`n" -ForegroundColor Green

Write-Host "Push tags vers GitHub..." -ForegroundColor Yellow
try {
    git push origin --tags
    Write-Host "  OK: Tags pushes vers GitHub" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR: Push tags - $_" -ForegroundColor Red
}

# ============================================================================
# ETAPE 4: SUPPRIMER BRANCHES BACKUP LOCALES
# ============================================================================
Write-Host "`n4. SUPPRESSION BRANCHES BACKUP LOCALES" -ForegroundColor Green
Write-Host "   ====================================`n" -ForegroundColor Green

Write-Host "Voulez-vous supprimer les branches backup locales? (O/N)" -ForegroundColor Cyan
Write-Host "  (Les tags sont sauvegardes sur GitHub)" -ForegroundColor Gray
$response = Read-Host

if ($response -eq 'O' -or $response -eq 'o') {
    Write-Host "`nSuppression en cours..." -ForegroundColor Yellow
    
    foreach ($branch in $backupBranches) {
        $branchExists = git branch --list $branch
        if (-not $branchExists) {
            continue
        }
        
        try {
            # Force suppression (commits non merges OK car tags crees)
            git branch -D $branch 2>$null
            Write-Host "  OK: $branch supprimee" -ForegroundColor Green
        } catch {
            Write-Host "  ERREUR: $branch - $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n=== SUPPRESSION TERMINEE ===" -ForegroundColor Green
} else {
    Write-Host "`nSuppression annulee." -ForegroundColor Yellow
}

# ============================================================================
# ETAPE 5: SUPPRIMER BRANCHES BACKUP DISTANTES
# ============================================================================
Write-Host "`n5. SUPPRESSION BRANCHES BACKUP DISTANTES (GITHUB)" -ForegroundColor Green
Write-Host "   ==============================================`n" -ForegroundColor Green

# Verifier branches distantes backup
$remoteBranches = git branch -r | Select-String "backup"
if ($remoteBranches) {
    Write-Host "Branches backup distantes trouvees:" -ForegroundColor Yellow
    $remoteBranches | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    
    Write-Host "`nVoulez-vous supprimer les branches backup sur GitHub? (O/N)" -ForegroundColor Cyan
    Write-Host "  (Les tags sont sauvegardes)" -ForegroundColor Gray
    $response = Read-Host
    
    if ($response -eq 'O' -or $response -eq 'o') {
        Write-Host "`nSuppression en cours..." -ForegroundColor Yellow
        
        # Supprimer backup-source-2025-10-26 (seule sur GitHub)
        try {
            git push origin --delete backup-source-2025-10-26 2>$null
            Write-Host "  OK: backup-source-2025-10-26 supprimee de GitHub" -ForegroundColor Green
        } catch {
            Write-Host "  INFO: backup-source-2025-10-26 deja supprimee ou inexistante" -ForegroundColor Gray
        }
        
        Write-Host "`n=== SUPPRESSION DISTANTE TERMINEE ===" -ForegroundColor Green
    } else {
        Write-Host "`nSuppression annulee." -ForegroundColor Yellow
    }
} else {
    Write-Host "Aucune branche backup distante trouvee." -ForegroundColor Gray
}

# ============================================================================
# RESUME
# ============================================================================
Write-Host "`n=== RESUME ===" -ForegroundColor Cyan

Write-Host "`nTags crees (sauvegardes):" -ForegroundColor Green
git tag | Select-String "archive/" | ForEach-Object { Write-Host "  + $_" -ForegroundColor Green }

Write-Host "`nBranches conservees:" -ForegroundColor Green
Write-Host "  Windows (actuel):" -ForegroundColor Yellow
Write-Host "    + main" -ForegroundColor Green
Write-Host "    + fix/macos-build" -ForegroundColor Green
Write-Host "  macOS (futur):" -ForegroundColor Yellow
Write-Host "    + macos-workflow-only" -ForegroundColor Cyan
Write-Host "    + refactor/flat-structure" -ForegroundColor Cyan

Write-Host "`nProchaines actions:" -ForegroundColor Cyan
Write-Host "  1. Verifier tags: git tag" -ForegroundColor White
Write-Host "  2. Push corrections: .\push-github.ps1" -ForegroundColor White
Write-Host "  3. Verifier branches: git branch -a" -ForegroundColor White

Write-Host "`n=== ORGANISATION TERMINEE ===" -ForegroundColor Green

