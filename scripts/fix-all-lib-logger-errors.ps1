# Script pour corriger toutes les erreurs logger dans lib/
$libFiles = Get-ChildItem -Path "src/lib/*.ts" -Recurse

foreach ($file in $libFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $fixed = $false
    
    # Pattern 1: logger.error('message:', error) -> logger.error('message', { error: ... })
    if ($content -match "logger\.error\('([^']+)',\s*error\)") {
        $content = $content -replace "logger\.error\('([^']+)',\s*error\)", "const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.error('`$1', { error: errorMessage })"
        $fixed = $true
    }
    
    # Pattern 2: logger.error("message:", error)
    if ($content -match 'logger\.error\("([^"]+)",\s*error\)') {
        $content = $content -replace 'logger\.error\("([^"]+)",\s*error\)', 'const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.error("$1", { error: errorMessage })'
        $fixed = $true
    }
    
    # Pattern 3: logger.info('message:', value) -> logger.info('message', { value })
    if ($content -match "logger\.info\('([^']+)',\s*[^\{]") {
        $content = $content -replace "logger\.info\('([^']+)',\s*([^\)]+)\)", "logger.info('`$1', { value: `$2 })"
        $fixed = $true
    }
    
    # Pattern 4: logger.info("message:", value)
    if ($content -match 'logger\.info\("([^"]+)",\s*[^\{]') {
        $content = $content -replace 'logger\.info\("([^"]+)",\s*([^\)]+)\)', 'logger.info("$1", { value: $2 })'
        $fixed = $true
    }
    
    if ($fixed -and $content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}

Write-Host "`nDone!"

