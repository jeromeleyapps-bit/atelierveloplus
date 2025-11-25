# Script pour corriger TOUTES les apostrophes non échappées
# RÈGLE D'OR #7: ZÉRO TOLÉRANCE ERREURS

Write-Host "Correction de toutes les apostrophes non echappees..." -ForegroundColor Cyan

$files = Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts | Where-Object { 
    $_.FullName -notlike "*node_modules*" 
}

$totalFixed = 0

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    $modified = $false
    $newLines = @()
    
    foreach ($line in $lines) {
        $newLine = $line
        
        # Remplacer ' par &apos; dans les balises JSX (entre > et <)
        # Pattern: texte entre balises contenant des apostrophes
        if ($line -match '>\s*[^<]*''[^<]*<') {
            # Remplacer uniquement dans le contenu JSX, pas dans les attributs
            $newLine = $line -replace "([>][^<]*)'([^<]*[<])", '$1&apos;$2'
            
            # Si encore des apostrophes, continuer
            while ($newLine -match '([>][^<]*''[^<]*[<])') {
                $newLine = $newLine -replace "([>][^<]*)'([^<]*[<])", '$1&apos;$2'
            }
            
            if ($newLine -ne $line) {
                $modified = $true
                $totalFixed++
            }
        }
        
        $newLines += $newLine
    }
    
    if ($modified) {
        $newLines | Set-Content -Path $file.FullName
        Write-Host "  Corrige: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Termine! $totalFixed lignes corrigees" -ForegroundColor Green
Write-Host ""
Write-Host "Verification ESLint..." -ForegroundColor Cyan
$errors = npm run lint 2>&1 | Select-String "Error:" | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "Erreurs restantes: $errors" -ForegroundColor $(if ($errors -eq 0) { "Green" } else { "Yellow" })
