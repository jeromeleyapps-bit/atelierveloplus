# Script de nettoyage du projet
# Usage: .\cleanup.ps1

Write-Host "=== Nettoyage du Projet Atelier Velo+ ===" -ForegroundColor Cyan
Write-Host ""

$cleaned = 0
$moved = 0

# 1. Supprimer fichiers SQLite obsoletes
Write-Host "1. Suppression fichiers SQLite..." -ForegroundColor Yellow
$sqliteFiles = @(
    "prisma/dev.db",
    "prisma/data/app.db"
)
foreach ($file in $sqliteFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Supprime: $file" -ForegroundColor Gray
        $cleaned++
    }
}

# 2. Supprimer fichiers .env temporaires
Write-Host "2. Suppression fichiers .env temporaires..." -ForegroundColor Yellow
$envFiles = @(
    ".env.backup",
    ".env.local",
    "env-corrected.txt",
    "env-recommended.txt"
)
foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Supprime: $file" -ForegroundColor Gray
        $cleaned++
    }
}

# 3. Supprimer documentation redondante
Write-Host "3. Suppression documentation redondante..." -ForegroundColor Yellow
$docFiles = @(
    "FINAL_STEPS.md",
    "FIX_ENV_FILE.md",
    "MANUAL_DB_SETUP.md",
    "MIGRATION_FIXES.md",
    "README_MIGRATION.md",
    "SETUP_DATABASE.md",
    "START_HERE.md"
)
foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Supprime: $file" -ForegroundColor Gray
        $cleaned++
    }
}

# 4. Supprimer scripts temporaires
Write-Host "4. Suppression scripts temporaires..." -ForegroundColor Yellow
$tempScripts = @(
    "apply-migrations.js",
    "check-env.ps1",
    "check-requirements.ps1",
    "create-all-tables.sql",
    "create-tables.js",
    "fix-env.ps1",
    "force-db-push.js",
    "init-database.ps1"
)
foreach ($file in $tempScripts) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Supprime: $file" -ForegroundColor Gray
        $cleaned++
    }
}

# 5. Deplacer scripts utilitaires vers scripts/
Write-Host "5. Deplacement scripts utilitaires..." -ForegroundColor Yellow
$utilScripts = @(
    "check-password.js",
    "check-user.js",
    "ensure-admin.js",
    "list-tables.js",
    "check-tables.js",
    "test-connection.js",
    "generate-secret.ps1",
    "update-secrets.ps1",
    "setup-db.ps1"
)
foreach ($file in $utilScripts) {
    if (Test-Path $file) {
        Move-Item $file "scripts/" -Force
        Write-Host "  Deplace: $file -> scripts/" -ForegroundColor Gray
        $moved++
    }
}

# 6. Nettoyer fichiers auth obsoletes
Write-Host "6. Nettoyage code obsolete..." -ForegroundColor Yellow

# Supprimer src/lib/auth.ts (stub vide)
if (Test-Path "src/lib/auth.ts") {
    Remove-Item "src/lib/auth.ts" -Force
    Write-Host "  Supprime: src/lib/auth.ts (stub NextAuth)" -ForegroundColor Gray
    $cleaned++
}

# Supprimer route NextAuth obsolete
if (Test-Path "src/app/api/auth/[...nextauth]") {
    Remove-Item "src/app/api/auth/[...nextauth]" -Recurse -Force
    Write-Host "  Supprime: src/app/api/auth/[...nextauth]/ (stub NextAuth)" -ForegroundColor Gray
    $cleaned++
}

Write-Host ""
Write-Host "=== Nettoyage Termine ===" -ForegroundColor Green
Write-Host "  Fichiers supprimes: $cleaned" -ForegroundColor Cyan
Write-Host "  Fichiers deplaces: $moved" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentation conservee:" -ForegroundColor Yellow
Write-Host "  - README.md (principal)" -ForegroundColor Gray
Write-Host "  - AUDIT_REPORT.md (reference)" -ForegroundColor Gray
Write-Host "  - ACTION_PLAN.md (roadmap)" -ForegroundColor Gray
Write-Host "  - MULTI_TENANCY_GUIDE.md (futur)" -ForegroundColor Gray
Write-Host "  - IMPLEMENTATION_STEPS.md (futur)" -ForegroundColor Gray
Write-Host "  - QUICK_START.md (guide)" -ForegroundColor Gray
Write-Host "  - TROUBLESHOOTING.md (reference)" -ForegroundColor Gray
Write-Host ""
Write-Host "Scripts utilitaires dans scripts/:" -ForegroundColor Yellow
Write-Host "  - check-tables.js" -ForegroundColor Gray
Write-Host "  - test-connection.js" -ForegroundColor Gray
Write-Host "  - generate-secret.ps1" -ForegroundColor Gray
Write-Host "  - etc." -ForegroundColor Gray
Write-Host ""
Write-Host "Testez l'application: npm run dev" -ForegroundColor Cyan
