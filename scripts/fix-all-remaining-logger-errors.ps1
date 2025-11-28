# Script pour corriger toutes les erreurs logger restantes
Write-Host "🔧 Correction automatique des erreurs logger restantes..." -ForegroundColor Cyan

# Trouver tous les fichiers avec erreurs logger
$files = Get-ChildItem -Path "src" -Include *.ts,*.tsx -Recurse | Where-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $content -match "logger\.(error|info|warn|debug)\([^,]+,\s*[^\{]"
    }
}

Write-Host "📁 ${($files.Count)} fichiers à corriger..." -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $fixed = $false
    
    # Pattern 1: logger.error('message:', error) -> logger.error('message', { error: ... })
    if ($content -match "logger\.error\('([^']+)',\s*error\)") {
        $content = $content -replace "logger\.error\('([^']+)',\s*error\)", {
            param($match)
            "const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.error('$($match.Groups[1].Value)', { error: errorMessage })"
        }
        $fixed = $true
    }
    
    # Pattern 2: logger.error("message:", error)
    if ($content -match 'logger\.error\("([^"]+)",\s*error\)') {
        $content = $content -replace 'logger\.error\("([^"]+)",\s*error\)', {
            param($match)
            "const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.error(`"$($match.Groups[1].Value)`", { error: errorMessage })"
        }
        $fixed = $true
    }
    
    # Pattern 3: logger.info('message:', value) -> logger.info('message', { value })
    if ($content -match "logger\.info\('([^']+)',\s*([^\{\)]+)\)") {
        $content = $content -replace "logger\.info\('([^']+)',\s*([^\{\)]+)\)", {
            param($match)
            $value = $match.Groups[2].Value.Trim()
            # Détecter le type de valeur pour créer la bonne clé
            if ($value -match '^(string|number|boolean)$') {
                "logger.info('$($match.Groups[1].Value)', { value: $value })"
            } else {
                "logger.info('$($match.Groups[1].Value)', { value: $value })"
            }
        }
        $fixed = $true
    }
    
    # Pattern 4: logger.info("message:", value)
    if ($content -match 'logger\.info\("([^"]+)",\s*([^\{\)]+)\)') {
        $content = $content -replace 'logger\.info\("([^"]+)",\s*([^\{\)]+)\)', {
            param($match)
            $value = $match.Groups[2].Value.Trim()
            "logger.info(`"$($match.Groups[1].Value)`", { value: $value })"
        }
        $fixed = $true
    }
    
    if ($fixed -and $content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "✅ Corrigé: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Terminé !" -ForegroundColor Green

