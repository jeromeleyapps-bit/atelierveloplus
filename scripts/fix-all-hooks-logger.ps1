# Script pour corriger toutes les erreurs logger dans les hooks
$hookFiles = @(
    "src/hooks/useAdminDashboardData.ts",
    "src/hooks/useAdminDashboardMutations.ts",
    "src/hooks/useAppointmentsMutations.ts",
    "src/hooks/useBikeSearch.ts",
    "src/hooks/useBikesMutations.ts",
    "src/hooks/useCashRegisterMutations.ts",
    "src/hooks/useCatalogMutations.ts",
    "src/hooks/useCreateTicketForm.ts",
    "src/hooks/useCustomersMutations.ts",
    "src/hooks/useLocalStorage.ts",
    "src/hooks/useLogoUpload.ts",
    "src/hooks/useServiceRatesMutations.ts",
    "src/hooks/useSystemSettings.ts",
    "src/hooks/useSystemSettingsMutations.ts",
    "src/hooks/useTicketsMutations.ts"
)

foreach ($file in $hookFiles) {
    $path = Join-Path $PSScriptRoot ".." $file
    $path = Resolve-Path $path -ErrorAction SilentlyContinue
    if (-not $path) { continue }
    
    $content = Get-Content $path -Raw
    $original = $content
    
    # Pattern: logger.error('msg:', error) -> logger.error('msg', { error: ... })
    $content = $content -replace "logger\.error\('([^']+)',\s*error\)", "const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.error('`$1', { error: errorMessage })"
    $content = $content -replace 'logger\.error\("([^"]+)",\s*error\)', 'const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.error("$1", { error: errorMessage })'
    
    # Pattern avec err
    $content = $content -replace "logger\.error\('([^']+)',\s*err\)", "const errorMessage = err instanceof Error ? err.message : String(err);`r`n      logger.error('`$1', { error: errorMessage })"
    $content = $content -replace 'logger\.error\("([^"]+)",\s*err\)', 'const errorMessage = err instanceof Error ? err.message : String(err);`r`n      logger.error("$1", { error: errorMessage })'
    
    # Pattern: logger.info('msg:', error) -> logger.info('msg', { error: ... })
    $content = $content -replace "logger\.info\('([^']+)',\s*error\)", "const errorMessage = error instanceof Error ? error.message : String(error);`r`n      logger.info('`$1', { error: errorMessage })"
    
    if ($content -ne $original) {
        Set-Content $path $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "Done!"

