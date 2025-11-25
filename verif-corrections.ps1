# Verification Corrections - Ultra Simple
Write-Host "`n=== VERIFICATION CORRECTIONS ===" -ForegroundColor Cyan

# 1. Config macOS
$config = Get-Content "electron-builder.config.yml" -Raw
if ($config -like "*mac:*target:*") {
    Write-Host "ERREUR: Config macOS presente" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Config macOS supprimee" -ForegroundColor Green

# 2. Prisma await
$prisma = Get-Content "src/lib/prisma.ts" -Raw
if ($prisma -like "*await import*") {
    Write-Host "ERREUR: await import present" -ForegroundColor Red
    exit 1
}
Write-Host "OK: await import corrige" -ForegroundColor Green

# 3. Prisma require
if ($prisma -like "*require*module*") {
    Write-Host "OK: require present" -ForegroundColor Green
} else {
    Write-Host "ERREUR: require manquant" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== CORRECTIONS VALIDEES ===" -ForegroundColor Green
Write-Host "Lancez: .\test-build.ps1" -ForegroundColor Cyan
exit 0

