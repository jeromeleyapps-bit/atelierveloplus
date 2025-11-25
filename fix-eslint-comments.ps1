# Script pour supprimer les commentaires eslint-disable invalides
# Méthodologie AGILE+ - Correction globale automatisée

Write-Host "🔧 Suppression des commentaires eslint-disable invalides..." -ForegroundColor Cyan

$files = @(
    "src\lib\prisma.ts",
    "src\lib\dbReset.ts",
    "src\app\api\admin\backup\route.ts",
    "src\app\api\admin\system-settings\route.ts",
    "src\app\catalog\services\page.tsx",
    "src\app\api\finance\invoices\[id]\issue\route.ts",
    "src\app\api\finance\invoices\[id]\remind\route.ts",
    "src\app\api\finance\invoices\[id]\route.ts",
    "src\app\api\workorders\[id]\lines\route.ts",
    "src\app\communications\page.tsx"
)

$patterns = @(
    "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
    "// eslint-disable-next-line @typescript-eslint/no-require-imports"
)

$totalRemoved = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $originalContent = $content
        
        foreach ($pattern in $patterns) {
            $content = $content -replace [regex]::Escape($pattern), ""
        }
        
        # Nettoyer les lignes vides multiples
        $content = $content -replace "(\r?\n){3,}", "`r`n`r`n"
        
        if ($content -ne $originalContent) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            $removed = ($originalContent.Length - $content.Length) / $pattern.Length
            $totalRemoved += $removed
            Write-Host "  ✅ $file - Commentaires supprimés" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  $file - Fichier introuvable" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Terminé ! $totalRemoved commentaires invalides supprimés" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Vérification ESLint..." -ForegroundColor Cyan
npm run lint 2>&1 | Select-String "@typescript-eslint" | Measure-Object | ForEach-Object {
    if ($_.Count -eq 0) {
        Write-Host "✅ Plus d'erreurs @typescript-eslint !" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Il reste $($_.Count) erreurs @typescript-eslint" -ForegroundColor Yellow
    }
}
