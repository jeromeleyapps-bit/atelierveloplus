# Script pour appliquer la migration devis sans bloquer
# Usage: .\apply-quotes-migration.ps1

Write-Host "=== Migration Support Devis ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Etape 1: Regeneration du client Prisma..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Echec generation client Prisma" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Client Prisma genere" -ForegroundColor Green
Write-Host ""

Write-Host "Etape 2: Application SQL dans Supabase..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Ouvrez Supabase SQL Editor et executez:" -ForegroundColor Cyan
Write-Host "  1. Allez sur https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host "  2. Database -> SQL Editor" -ForegroundColor Gray
Write-Host "  3. Copiez le contenu de: add-quotes-fields.sql" -ForegroundColor Gray
Write-Host "  4. Executez le SQL" -ForegroundColor Gray
Write-Host ""

Write-Host "Contenu SQL a executer:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Get-Content "add-quotes-fields.sql"
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "Appuyez sur Entree une fois le SQL execute dans Supabase..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "Etape 3: Verification..." -ForegroundColor Yellow
node scripts/check-tables.js

Write-Host ""
Write-Host "Migration terminee!" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant:" -ForegroundColor Cyan
Write-Host "  - Creer des devis depuis les tickets" -ForegroundColor Gray
Write-Host "  - Convertir des devis en factures" -ForegroundColor Gray
Write-Host "  - Tester avec: npm run dev" -ForegroundColor Gray
