# Script PowerShell pour corriger automatiquement les erreurs logger dans les hooks
# Pattern: logger.error('message:', error) -> logger.error('message', { error: errorMessage })

$files = @(
    'src/hooks/useAdminCatalogMutations.ts',
    'src/hooks/useAdminDashboardMutations.ts',
    'src/hooks/useSystemSettingsMutations.ts',
    'src/hooks/useBikesMutations.ts',
    'src/hooks/useAppointmentsMutations.ts',
    'src/hooks/useCashRegisterMutations.ts',
    'src/hooks/useTicketsMutations.ts',
    'src/hooks/useServiceRatesMutations.ts',
    'src/hooks/useLogoUpload.ts',
    'src/hooks/useLocalStorage.ts',
    'src/hooks/useCustomersMutations.ts',
    'src/hooks/useCreateTicketForm.ts',
    'src/hooks/useCatalogMutations.ts',
    'src/hooks/useBikeSearch.ts',
    'src/hooks/useAdminDashboardData.ts',
    'src/hooks/useCachedData.ts'
)

foreach ($file in $files) {
    $fullPath = Join-Path $PWD $file
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file"
        $content = Get-Content $fullPath -Raw
        
        # Pattern 1: logger.error('message:', error) -> logger.error('message', { error: errorMessage })
        $content = $content -replace "logger\.error\('([^']+)',\s*error\)", "logger.error('`$1', { error: error instanceof Error ? error.message : String(error) })"
        $content = $content -replace 'logger\.error\("([^"]+)",\s*error\)', 'logger.error("$1", { error: error instanceof Error ? error.message : String(error) })'
        
        # Pattern 2: logger.error('message:', err) -> logger.error('message', { error: errorMessage })
        $content = $content -replace "logger\.error\('([^']+)',\s*err\)", "logger.error('`$1', { error: err instanceof Error ? err.message : String(err) })"
        $content = $content -replace 'logger\.error\("([^"]+)",\s*err\)', 'logger.error("$1", { error: err instanceof Error ? err.message : String(err) })'
        
        # Pattern 3: logger.error('message:', Error) -> logger.error('message', { error: errorMessage })
        $content = $content -replace "logger\.error\('([^']+)',\s*Error\)", "logger.error('`$1', { error: Error instanceof Error ? Error.message : String(Error) })"
        
        # Pattern 4: logger.info('message:', error) -> logger.info('message', { error: errorMessage })
        $content = $content -replace "logger\.info\('([^']+)',\s*error\)", "logger.info('`$1', { error: error instanceof Error ? error.message : String(error) })"
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "  ✓ Updated"
    } else {
        Write-Host "  ✗ Not found: $file"
    }
}

Write-Host "`nDone!"

