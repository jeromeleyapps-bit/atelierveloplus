# Build Rapide Portable - Fix ENAMETOOLONG
# Date: 22 novembre 2025

$ErrorActionPreference = "Stop"

Write-Host "`n=== BUILD RAPIDE PORTABLE ===" -ForegroundColor Cyan
Write-Host "Solution: target portable pour contourner ENAMETOOLONG`n" -ForegroundColor Yellow

# 1. Nettoyer
Write-Host "1. Nettoyage..." -ForegroundColor Yellow
if (Test-Path "dist-electron") {
    Remove-Item -Recurse -Force "dist-electron" -ErrorAction SilentlyContinue
}
if (Test-Path "electron-resources") {
    Remove-Item -Recurse -Force "electron-resources" -ErrorAction SilentlyContinue
}
Write-Host "   OK: Nettoyage termine" -ForegroundColor Green

# 2. Build Next.js
Write-Host "`n2. Build Next.js..." -ForegroundColor Yellow
$env:DATABASE_URL = "file:./data/atelier.db"
$env:NODE_ENV = "production"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERREUR: Build Next.js echoue" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Build Next.js reussi" -ForegroundColor Green

# 3. Preparation Electron
Write-Host "`n3. Preparation Electron..." -ForegroundColor Yellow
npm run postbuild
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERREUR: Preparation echouee" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Preparation reussie" -ForegroundColor Green

# 4. Build Electron Portable
Write-Host "`n4. Build Electron Portable..." -ForegroundColor Yellow
Write-Host "   (peut prendre 10-15 minutes)" -ForegroundColor Gray

npx electron-builder -c electron-builder.config.yml
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERREUR: Build Electron echoue" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Build Electron reussi" -ForegroundColor Green

# 5. Verification
Write-Host "`n5. Verification..." -ForegroundColor Yellow
$portableExe = Get-ChildItem "dist-electron" -Filter "*portable.exe" -Recurse | Select-Object -First 1

if ($portableExe) {
    Write-Host "   OK: Executable portable cree" -ForegroundColor Green
    Write-Host "   Fichier: $($portableExe.FullName)" -ForegroundColor Cyan
    $sizeMB = [math]::Round($portableExe.Length / 1MB, 1)
    Write-Host "   Taille: $sizeMB MB" -ForegroundColor Cyan
} else {
    Write-Host "   ERREUR: Executable portable non trouve" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== BUILD REUSSI ===" -ForegroundColor Green
Write-Host "`nExecutable: $($portableExe.FullName)" -ForegroundColor White
Write-Host "Lancez-le pour tester l'application !`n" -ForegroundColor White

exit 0


