Write-Host "=== VERIFICATION CONFIGURATION NSIS ===" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier target: nsis
$targetNsis = Select-String -Path "electron-builder.config.yml" -Pattern "target: nsis"
if ($targetNsis) {
    Write-Host "[OK] target: nsis trouve" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] target: nsis NON trouve" -ForegroundColor Red
    exit 1
}

# 2. Vérifier useZip: true
$useZip = Select-String -Path "electron-builder.config.yml" -Pattern "useZip: true"
if ($useZip) {
    Write-Host "[OK] useZip: true trouve" -ForegroundColor Green
} else {
    Write-Host "[ERREUR] useZip: true NON trouve" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== CONFIGURATION OK - PRET POUR BUILD ===" -ForegroundColor Green
Write-Host ""
Write-Host "Lancer le build avec:" -ForegroundColor Yellow
Write-Host "  .\build-electron-asar.ps1" -ForegroundColor White


