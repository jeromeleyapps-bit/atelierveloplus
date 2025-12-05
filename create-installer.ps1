# ============================================================================
# CREATE INSTALLER - Atelier Velo+
# ============================================================================
# Cree un installateur ZIP auto-extractible a partir du dossier unpacked
# Contourne le probleme ENAMETOOLONG de NSIS
# ============================================================================

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "CREATION INSTALLATEUR - ATELIER VELO+" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$version = "1.0.17"
$unpackedPath = "dist-electron\win-unpacked"
$outputPath = "dist-electron"
$zipName = "Atelier-Velo-Plus-$version-win-x64.zip"
$exeName = "Atelier-Velo-Plus-$version-Setup.exe"

# Verification
if (-not (Test-Path $unpackedPath)) {
    Write-Host "ERREUR: Dossier unpacked introuvable: $unpackedPath" -ForegroundColor Red
    Write-Host "Executez d'abord: npm run build:electron" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/3] Creation archive ZIP..." -ForegroundColor Yellow

$zipPath = Join-Path $outputPath $zipName
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Utiliser Compress-Archive (PowerShell natif)
Compress-Archive -Path "$unpackedPath\*" -DestinationPath $zipPath -CompressionLevel Optimal

if (Test-Path $zipPath) {
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host "  Archive creee: $zipName ($zipSize MB)" -ForegroundColor Green
} else {
    Write-Host "ERREUR: Echec creation archive" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] Creation script d'installation..." -ForegroundColor Yellow

$installScript = @"
@echo off
title Installation Atelier Velo+
echo.
echo ========================================
echo   INSTALLATION ATELIER VELO+ $version
echo ========================================
echo.
echo Extraction en cours...
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\Programs\Atelier Velo+"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

powershell -Command "Expand-Archive -Path '%~dp0$zipName' -DestinationPath '%INSTALL_DIR%' -Force"

echo.
echo Creation raccourci Bureau...
powershell -Command "`$WshShell = New-Object -ComObject WScript.Shell; `$Shortcut = `$WshShell.CreateShortcut('%USERPROFILE%\Desktop\Atelier Velo+.lnk'); `$Shortcut.TargetPath = '%INSTALL_DIR%\Atelier Velo+.exe'; `$Shortcut.Save()"

echo.
echo ========================================
echo   INSTALLATION TERMINEE !
echo ========================================
echo.
echo L'application est installee dans:
echo   %INSTALL_DIR%
echo.
echo Un raccourci a ete cree sur le Bureau.
echo.
pause
"@

$installScriptPath = Join-Path $outputPath "install.bat"
$installScript | Out-File -FilePath $installScriptPath -Encoding ASCII
Write-Host "  Script install.bat cree" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Resume..." -ForegroundColor Yellow
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Green
Write-Host "INSTALLATEUR CREE AVEC SUCCES" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "Fichiers generes dans $outputPath :" -ForegroundColor White
Write-Host "  - $zipName ($zipSize MB)" -ForegroundColor Cyan
Write-Host "  - install.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "DISTRIBUTION:" -ForegroundColor Yellow
Write-Host "  1. Copiez les 2 fichiers dans le meme dossier" -ForegroundColor White
Write-Host "  2. L'utilisateur execute install.bat" -ForegroundColor White
Write-Host "  3. L'application s'installe dans AppData\Local\Programs" -ForegroundColor White
Write-Host ""
Write-Host "ALTERNATIVE - Distribution directe:" -ForegroundColor Yellow
Write-Host "  Copiez le dossier win-unpacked et lancez 'Atelier Velo+.exe'" -ForegroundColor White
Write-Host ""
