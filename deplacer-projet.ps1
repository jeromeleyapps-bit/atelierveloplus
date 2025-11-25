# Déplacer projet vers chemin court
# Solution définitive pour ENAMETOOLONG

Write-Host "=== DEPLACEMENT PROJET VERS CHEMIN COURT ===" -ForegroundColor Cyan
Write-Host ""

$sourceDir = "C:\Users\j_ley\Atelier-velo+"
$targetDir = "C:\AtelierVelo"

Write-Host "Source: $sourceDir" -ForegroundColor Yellow
Write-Host "Cible:  $targetDir" -ForegroundColor Yellow
Write-Host ""

# Vérifier si cible existe déjà
if (Test-Path $targetDir) {
    Write-Host "[ERREUR] Le dossier $targetDir existe deja" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. Supprimer: Remove-Item -Recurse -Force '$targetDir'" -ForegroundColor White
    Write-Host "  2. Choisir autre nom: Modifier \$targetDir dans ce script" -ForegroundColor White
    exit 1
}

Write-Host "ATTENTION: Cette operation va deplacer tout le projet" -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "Continuer? (O/N)"

if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Operation annulee" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deplacement en cours..." -ForegroundColor Yellow
Write-Host "  (Cela peut prendre quelques minutes)" -ForegroundColor Gray

try {
    # Déplacer le dossier
    Move-Item -Path $sourceDir -Destination $targetDir -Force
    
    Write-Host ""
    Write-Host "[OK] Projet deplace vers $targetDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines etapes:" -ForegroundColor Cyan
    Write-Host "  1. cd $targetDir" -ForegroundColor White
    Write-Host "  2. .\verif-build-nsis.ps1" -ForegroundColor White
    Write-Host "  3. .\build-nsis-log.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Gain longueur chemin:" -ForegroundColor Green
    Write-Host "  Avant: $($sourceDir.Length) caracteres" -ForegroundColor Gray
    Write-Host "  Apres: $($targetDir.Length) caracteres" -ForegroundColor Gray
    Write-Host "  Economie: $($sourceDir.Length - $targetDir.Length) caracteres" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "[ERREUR] Echec deplacement: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}


