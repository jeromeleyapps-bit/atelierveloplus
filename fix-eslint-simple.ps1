# Script simple pour supprimer les commentaires eslint-disable invalides

Write-Host "Suppression des commentaires eslint-disable invalides..." -ForegroundColor Cyan

$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx | Where-Object { 
    $_.FullName -notlike "*node_modules*" 
}

$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content
    
    # Supprimer les commentaires invalides
    $newContent = $newContent -replace "// eslint-disable-next-line @typescript-eslint/no-explicit-any\r?\n", ""
    $newContent = $newContent -replace "// eslint-disable-next-line @typescript-eslint/no-require-imports\r?\n", ""
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $count++
        Write-Host "  Corrige: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Termine! $count fichiers corriges" -ForegroundColor Green
