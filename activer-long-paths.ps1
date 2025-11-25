# Activer support chemins longs Windows
# IMPORTANT: Nécessite PowerShell en Administrateur

Write-Host "=== ACTIVATION CHEMINS LONGS WINDOWS ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si exécuté en admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERREUR] Ce script doit etre execute en tant qu'Administrateur" -ForegroundColor Red
    Write-Host ""
    Write-Host "Relancez PowerShell:" -ForegroundColor Yellow
    Write-Host "  1. Clic droit sur PowerShell" -ForegroundColor White
    Write-Host "  2. 'Executer en tant qu'administrateur'" -ForegroundColor White
    Write-Host "  3. Relancer ce script" -ForegroundColor White
    exit 1
}

Write-Host "1. Verification valeur actuelle..." -ForegroundColor Yellow
$currentValue = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue

if ($currentValue.LongPathsEnabled -eq 1) {
    Write-Host "  [OK] LongPathsEnabled deja active" -ForegroundColor Green
} else {
    Write-Host "  [INFO] LongPathsEnabled non active" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Activation LongPathsEnabled..." -ForegroundColor Yellow
    
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
    
    Write-Host "  [OK] LongPathsEnabled active" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Redemarrage requis pour appliquer les changements" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Configuration Git..." -ForegroundColor Yellow
git config --global core.longpaths true
Write-Host "  [OK] Git configure pour chemins longs" -ForegroundColor Green

Write-Host ""
Write-Host "=== CONFIGURATION TERMINEE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Cyan
Write-Host "  1. Redemarrer Windows" -ForegroundColor White
Write-Host "  2. Relancer le build" -ForegroundColor White


